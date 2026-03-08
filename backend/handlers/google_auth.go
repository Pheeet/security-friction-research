// handlers/google_auth.go
package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
	"sync"

	"backend-api/database"
	"backend-api/utils"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

var googleOauthConfig *oauth2.Config

var TokenCache sync.Map

// 1. ตั้งค่า Config (เรียกใช้ใน main.go)
func InitGoogleAuth() {
	backendURL := database.GetEnv("BACKEND_URL", "http://localhost:8080")
	googleOauthConfig = &oauth2.Config{
		RedirectURL: backendURL + "/api/auth/google/callback",
		// --- ใส่ Client ID และ Secret ของคุณตรงนี้ ---
		ClientID:     database.GetEnv("GOOGLE_CLIENT_ID", ""),
		ClientSecret: database.GetEnv("GOOGLE_CLIENT_SECRET", ""),
		Scopes:       []string{"https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"},
		Endpoint:     google.Endpoint,
	}
}

// 2. Handler สำหรับปุ่ม "Sign in with Google"
func GoogleLogin(c *gin.Context) {
	// 💡 1. รับค่าพฤติกรรมที่ Frontend แนบมากับ URL
	mode := c.Query("mode")
	mouse := c.Query("mouse")
	paste := c.Query("paste")
	bs := c.Query("bs")
	timeParam := c.Query("time")

	// กันเหนียว เผื่อไม่มีการส่งค่ามา
	if mode == "" {
		mode = "static"
	}

	// 💡 2. แพ็กข้อมูลทั้งหมดรวมกัน คั่นด้วยเครื่องหมาย |
	// ตัวอย่าง: "adaptive|true|false|0|1700000000"
	stateString := fmt.Sprintf("%s|%s|%s|%s|%s", mode, mouse, paste, bs, timeParam)

	// 💡 3. ฝาก stateString ไปให้ Google ถือไว้
	url := googleOauthConfig.AuthCodeURL(stateString, oauth2.AccessTypeOffline)
	c.Redirect(http.StatusTemporaryRedirect, url)
}

// 3. Handler สำหรับรับ Callback จาก Google
func GoogleCallback(c *gin.Context) {

	code := c.Query("code")
	state := c.Query("state") // 💡 รับกล่อง state คืนมาจาก Google

	token, err := googleOauthConfig.Exchange(context.Background(), code)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Code exchange failed"})
		return
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo?access_token=" + token.AccessToken)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "User data fetch failed"})
		return
	}
	defer resp.Body.Close()

	content, _ := io.ReadAll(resp.Body)

	var googleUser struct {
		ID      string `json:"id"`
		Email   string `json:"email"`
		Name    string `json:"name"`
		Picture string `json:"picture"`
	}

	json.Unmarshal(content, &googleUser)

	googleUser.Email = strings.ToLower(googleUser.Email)

	var user database.User

	// -----------------------------
	// ❌ ถ้าไม่มี user → ไป Register
	// -----------------------------
	if err := database.DB.Where("email = ?", googleUser.Email).First(&user).Error; err != nil {
		encodedEmail := url.QueryEscape(googleUser.Email)
		encodedName := url.QueryEscape(googleUser.Name)
		frontendURL := database.GetEnv("FRONTEND_URL", "http://localhost:3000")
		registerURL := fmt.Sprintf(
			frontendURL+"/register?provider=google&email=%s&fullname=%s",
			encodedEmail,
			encodedName,
		)

		c.Redirect(http.StatusFound, registerURL)
		return
	}

	// ------------------------------------------
	// 💡 แกะกล่องข้อมูล State ที่ฝาก Google ไว้
	// ------------------------------------------
	stateParts := strings.Split(state, "|")
	experimentMode := "static"
	mouseMoved := false
	hasPasted := false
	backspaceCount := 0
	var timeLogin int64 = 0

	if len(stateParts) == 5 {
		experimentMode = stateParts[0]
		mouseMoved = (stateParts[1] == "true")
		hasPasted = (stateParts[2] == "true")
		backspaceCount, _ = strconv.Atoi(stateParts[3])

		startTimeMs, _ := strconv.ParseInt(stateParts[4], 10, 64)
		if startTimeMs > 0 {
			timeLogin = time.Now().UnixMilli() - startTimeMs
		}
	}

	riskLevel := "static"
	captchaType := ""
	require2FA := "true"
	tokenString := ""
	syncCode := ""

	if experimentMode == "adaptive" {
		// 💡 จำลอง LoginRequest เพื่อเอาไปเข้าฟังก์ชันคำนวณคะแนน
		adaptiveReq := LoginRequest{
			MouseMoved:     mouseMoved,
			HasPasted:      hasPasted,
			BackspaceCount: backspaceCount,
			TypingTime:     0, // Google SSO ไม่มีการพิมพ์รหัสผ่าน
		}

		// 💡 คำนวณคะแนน Adaptive
		riskLevel, captchaType = CalculateRiskScore(adaptiveReq)

		if riskLevel == "high" {
			require2FA = "true"
		} else {
			require2FA = "false"
		}

		// 💡 แจก Token ทันทีให้กับกลุ่ม Low และ Medium
		if riskLevel == "low" || riskLevel == "medium" {
			secret := database.GetEnv("JWT_SECRET", "dev-secret-key")
			token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
				"user_id": user.ID,
				"exp":     time.Now().Add(time.Hour * 24).Unix(),
			})
			if t, err := token.SignedString([]byte(secret)); err == nil {
				tokenString = t

				// 💡 ตั้งค่า Cookie แบบปลอดภัยผ่าน utils
				utils.SetSecureCookie(c, "auth_token", tokenString, 3600*24)

				syncCode = uuid.New().String()
				TokenCache.Store(syncCode, tokenString)
			}
		}
	}

	sessionID := uuid.New().String()
	journey := database.ResearchJourney{
		UserID:         user.ID,
		SessionID:      sessionID,
		LoginMethod:    "sso",
		TimeLogin:      timeLogin,
		CurrentStage:   "login_success",
		ExperimentMode: experimentMode,
		RiskLevel:      riskLevel,
	}
	database.DB.Create(&journey)

	go syncDataToGoogleSheets(journey)

	utils.SetSecureCookie(c, "session_id", sessionID, 3600*24)

	user.TwoFACode = ""
	user.TwoFARef = ""
	user.IsPushApproved = false
	user.TwoFAExpiry = time.Time{}
	database.DB.Save(&user)

	frontendURL := database.GetEnv("FRONTEND_URL", "http://localhost:3000")

	// ⭐ แนบข้อมูลทั้งหมดไปกับ URL ให้หน้า Checkpoint (ไม่ส่ง Token ไปทาง URL แล้ว)
	checkpointURL := fmt.Sprintf(
		"%s/security-checkpoint?userId=%d&method=email&mode=%s&risk=%s&captcha=%s&req2fa=%s&sync=%s",
		frontendURL, user.ID, experimentMode, riskLevel, captchaType, require2FA, syncCode,
	)

	// เปลี่ยนเป็น StatusFound (302) ปลอดภัยกว่า
	c.Redirect(http.StatusFound, checkpointURL)
}

// --- API สำหรับขอ OTP หลังจากผ่าน Captcha ---

type RequestOTPRequest struct {
	UserID uint   `json:"user_id"`
	Method string `json:"method"` // "email" หรือ "push"
}

func RequestOTPHandler(c *gin.Context) {
	var req RequestOTPRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	var user database.User
	if err := database.DB.First(&user, req.UserID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	refCode := fmt.Sprintf("%04d", rand.Intn(10000))
	user.TwoFARef = refCode

	if req.Method == "email" {
		otp := fmt.Sprintf("%06d", rand.Intn(1000000))
		user.TwoFACode = otp
		user.TwoFAExpiry = time.Now().Add(5 * time.Minute)

		fmt.Printf("Sending Email OTP to %s...\n", user.Email)

		go func(targetEmail, targetOTP, targetRef string) {
			err := sendEmailOTP(targetEmail, targetOTP, targetRef)
			if err != nil {
				fmt.Printf("Error sending email: %v\n", err)
			} else {
				fmt.Printf("Email sent successfully to %s\n", targetEmail)
			}
		}(user.Email, otp, refCode)

	} else if req.Method == "push" {
		user.IsPushApproved = false
		user.TwoFACode = ""
		user.TwoFAExpiry = time.Now().Add(5 * time.Minute)

		backendURL := database.GetEnv("BACKEND_URL", "http://localhost:8080")
		link := fmt.Sprintf(backendURL+"/api/2fa/simulate-push-approve?user_id=%d", user.ID)
		fmt.Printf("\n--- [PUSH NOTI MOCK] ---\nApprove Link: %s\n----------------------\n", link)
	}

	database.DB.Save(&user)

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"message":  "OTP Sent successfully",
		"ref_code": refCode,
		"method":   req.Method,
	})
}

// --- Handler สำหรับเช็กว่ามี User/Email ซ้ำไหม ---
func CheckAvailabilityHandler(c *gin.Context) {
	username := c.Query("username")
	email := c.Query("email")

	if email != "" {
		email = strings.ToLower(email)
	}

	var user database.User

	if username != "" {
		if err := database.DB.Where("username = ?", username).First(&user).Error; err == nil {
			c.JSON(http.StatusOK, gin.H{"available": false, "message": "ชื่อผู้ใช้นี้ถูกใช้งานแล้ว"})
			return
		}
	}

	if email != "" {
		if err := database.DB.Where("email = ?", email).First(&user).Error; err == nil {
			c.JSON(http.StatusOK, gin.H{"available": false, "message": "อีเมลนี้ถูกใช้งานแล้ว"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"available": true})
}
