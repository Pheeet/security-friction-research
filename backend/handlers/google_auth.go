package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"net/url"
	"os"
	"time"

	"backend-api/database"

	"github.com/gin-gonic/gin"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

var googleOauthConfig *oauth2.Config

// 1. ตั้งค่า Config (เรียกใช้ใน main.go)
func InitGoogleAuth() {
	googleOauthConfig = &oauth2.Config{
		RedirectURL: "http://localhost:8080/api/auth/google/callback",
		// --- ใส่ Client ID และ Secret ของคุณตรงนี้ ---
		ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
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

	resp, err := http.Get("https://www.googleapis.com/oauth2/v2/userinfo?access_token=" + token.AccessToken)
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

	var user database.User

	// -----------------------------
	// ❌ ถ้าไม่มี user → ไป Register
	// -----------------------------
	if err := database.DB.Where("email = ?", googleUser.Email).First(&user).Error; err != nil {
		// ตรวจสอบบรรทัดที่ Redirect ไปหน้า Register
		encodedEmail := url.QueryEscape(googleUser.Email)
		encodedName := url.QueryEscape(googleUser.Name)
		registerURL := fmt.Sprintf(
			"http://localhost:3000/register?provider=google&email=%s&fullname=%s",
			encodedEmail,
			encodedName,
		)

		c.Redirect(http.StatusTemporaryRedirect, registerURL)
		return
	}

	// // -----------------------------
	// // ✅ ถ้ามี user แล้ว → ส่ง Email OTP
	// // -----------------------------

	// // สร้าง OTP 6 หลัก
	// otp := fmt.Sprintf("%06d", rand.Intn(1000000))

	// // สร้าง refCode 4 หลัก
	// refCode := fmt.Sprintf("%04d", rand.Intn(10000))

	// user.TwoFACode = otp
	// user.TwoFARef = refCode
	// user.TwoFAExpiry = time.Now().Add(5 * time.Minute)

	// database.DB.Save(&user)

	// fmt.Printf("Sending Email OTP to %s\n", user.Email)

	// // ส่งเมลแบบ goroutine
	// go func(targetEmail, targetOTP, targetRef string) {
	// 	err := sendEmailOTP(targetEmail, targetOTP, targetRef)
	// 	if err != nil {
	// 		fmt.Printf("Error sending email: %v\n", err)
	// 	} else {
	// 		fmt.Printf("Email sent successfully to %s\n", targetEmail)
	// 	}
	// }(user.Email, otp, refCode)

	// // Redirect ไปหน้า 2FA challenge แบบ email
	// twoFAURL := fmt.Sprintf(
	// 	"http://localhost:3000/2fa/challenge?userId=%d&method=email&refCode=%s",
	// 	user.ID,
	// 	refCode,
	// )

	// c.Redirect(http.StatusTemporaryRedirect, twoFAURL)
	user.TwoFACode = ""
	user.TwoFARef = ""
	user.IsPushApproved = false
	user.TwoFAExpiry = time.Time{}
	database.DB.Save(&user)

	checkpointURL := fmt.Sprintf(
		"http://localhost:3000/security-checkpoint?userId=%d&method=push",
		user.ID,
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

		link := fmt.Sprintf("http://localhost:8080/api/2fa/simulate-push-approve?user_id=%d", user.ID)
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
