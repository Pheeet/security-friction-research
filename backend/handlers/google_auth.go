//handlers/google_auth.go

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

	"backend-api/database"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

var googleOauthConfig *oauth2.Config

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
	// สร้าง URL เพื่อส่ง User ไปหน้า Login ของ Google
	url := googleOauthConfig.AuthCodeURL("state-token", oauth2.AccessTypeOffline)
	c.Redirect(http.StatusTemporaryRedirect, url)
}

// 3. Handler สำหรับรับ Callback จาก Google
func GoogleCallback(c *gin.Context) {

	code := c.Query("code")

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
		// ตรวจสอบบรรทัดที่ Redirect ไปหน้า Register
		encodedEmail := url.QueryEscape(googleUser.Email)
		encodedName := url.QueryEscape(googleUser.Name)
		frontendURL := database.GetEnv("FRONTEND_URL", "http://localhost:3000")
		registerURL := fmt.Sprintf(
			frontendURL+"/register?provider=google&email=%s&fullname=%s",
			encodedEmail,
			encodedName,
		)

		// เปลี่ยนเป็น StatusFound (302)
		c.Redirect(http.StatusFound, registerURL)
		return
	}

	// c.Redirect(http.StatusTemporaryRedirect, twoFAURL)
	var timeLogin int64 = 0
	cookieStr, err := c.Cookie("sso_start_time")
	if err == nil && cookieStr != "" {
		// แปลงข้อความจาก Cookie เป็นตัวเลข Int64
		startTimeMs, parseErr := strconv.ParseInt(cookieStr, 10, 64)
		if parseErr == nil {
			// เอาเวลาปัจจุบัน (ms) ลบด้วยเวลาตอนโหลดหน้าเว็บ
			timeLogin = time.Now().UnixMilli() - startTimeMs
		}
		// สั่งลบ Cookie ทิ้งเพื่อความสะอาด
		c.SetCookie("sso_start_time", "", -1, "/", database.GetEnv("COOKIE_DOMAIN", ""), database.GetEnv("ENV", "development") == "production", true)
	}
	experimentMode := "static"
	modeCookie, err := c.Cookie("experiment_mode")
	if err == nil && modeCookie == "adaptive" {
		experimentMode = "adaptive"
	}

	riskLevel := "static"
	captchaType := ""
	require2FA := "true"

	if experimentMode == "adaptive" {
		riskLevel = "low"
		captchaType = "none"
		require2FA = "false"

		secret := database.GetEnv("JWT_SECRET", "dev-secret-key")
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
			"user_id": user.ID,
			"exp":     time.Now().Add(time.Hour * 24).Unix(),
		})
		if tokenString, err := token.SignedString([]byte(secret)); err == nil {
			c.SetCookie("auth_token", tokenString, 3600*24, "/", database.GetEnv("COOKIE_DOMAIN", ""), database.GetEnv("ENV", "development") == "production", true)
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

	user.TwoFACode = ""
	user.TwoFARef = ""
	user.IsPushApproved = false
	user.TwoFARef = ""
	user.TwoFAExpiry = time.Time{}
	database.DB.Save(&user)

	frontendURL := database.GetEnv("FRONTEND_URL", "http://localhost:3000")
	checkpointURL := fmt.Sprintf(
		frontendURL+"/security-checkpoint?userId=%d&method=email&mode=%s&risk=%s&captcha=%s&req2fa=%s",
		user.ID, experimentMode, riskLevel, captchaType, require2FA,
	)

	c.Redirect(http.StatusTemporaryRedirect, checkpointURL)
}

// --- API ใหม่: สำหรับขอ OTP หลังจากผ่าน Captcha ---

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

	// สร้าง Ref Code ใหม่ทุกครั้งที่ขอ
	refCode := fmt.Sprintf("%04d", rand.Intn(10000))
	user.TwoFARef = refCode

	if req.Method == "email" {
		otp := fmt.Sprintf("%06d", rand.Intn(1000000))
		user.TwoFACode = otp
		user.TwoFAExpiry = time.Now().Add(5 * time.Minute) // เริ่มจับเวลา 5 นาทีตรงนี้!

		fmt.Printf("Sending Email OTP to %s...\n", user.Email)

		// ส่งอีเมลแบบ Goroutine
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

// --- เพิ่ม Handler ใหม่สำหรับเช็กว่ามี User/Email ซ้ำไหม ---
func CheckAvailabilityHandler(c *gin.Context) {
	username := c.Query("username")
	email := c.Query("email")

	// 🔥 แทรกตรงนี้: แปลง Email เป็นพิมพ์เล็ก
	if email != "" {
		email = strings.ToLower(email)
	}

	var user database.User

	// 1. เช็ก Username
	if username != "" {
		if err := database.DB.Where("username = ?", username).First(&user).Error; err == nil {
			// ถ้าเจอ user นี้ใน db แสดงว่าซ้ำ
			c.JSON(http.StatusOK, gin.H{"available": false, "message": "ชื่อผู้ใช้นี้ถูกใช้งานแล้ว"})
			return
		}
	}

	// 2. เช็ก Email
	if email != "" {
		if err := database.DB.Where("email = ?", email).First(&user).Error; err == nil {
			// ถ้าเจอ email นี้ใน db แสดงว่าซ้ำ
			c.JSON(http.StatusOK, gin.H{"available": false, "message": "อีเมลนี้ถูกใช้งานแล้ว"})
			return
		}
	}

	// ถ้าไม่เจอแสดงว่าว่าง (Available)
	c.JSON(http.StatusOK, gin.H{"available": true})
}
