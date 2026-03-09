// handlers/auth.go
package handlers

import (
	"backend-api/database"
	"backend-api/utils"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"
	"unicode"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

// ฟังก์ชันตรวจสอบความแข็งแกร่งรหัสผ่าน
func isPasswordStrong(pass string) bool {
	var (
		hasMinLen = false
		hasUpper  = false
		hasLower  = false
		hasNumber = false
	)
	if len(pass) >= 8 {
		hasMinLen = true
	}
	for _, char := range pass {
		switch {
		case unicode.IsUpper(char):
			hasUpper = true
		case unicode.IsLower(char):
			hasLower = true
		case unicode.IsNumber(char):
			hasNumber = true
		}
	}
	return hasMinLen && hasUpper && hasLower && hasNumber
}

// ฟังก์ชันช่วยส่งอีเมล (ใช้ Brevo API)
func sendEmailOTP(to string, otp string, refCode string) error {
	env := os.Getenv("ENV")
	if env == "development" || env == "" {
		// ถ้าเป็น Local ให้ปริ้นท์ลง Terminal สวยๆ แล้วจบการทำงานเลย (ไม่ต้องเรียก Brevo)
		fmt.Printf("\n=========================================\n")
		fmt.Printf("📬 [LOCAL DEV MODE] จำลองการส่งอีเมล\n")
		fmt.Printf("ผู้รับ: %s\n", to)
		fmt.Printf("รหัส OTP: %s\n", otp)
		fmt.Printf("รหัสอ้างอิง: %s\n", refCode)
		fmt.Printf("=========================================\n\n")
		return nil
	}
	apiKey := os.Getenv("BREVO_API_KEY")
	senderEmail := os.Getenv("SENDER_EMAIL") // อีเมล Gmail ของคุณที่ยืนยันใน Brevo แล้ว

	if apiKey == "" || senderEmail == "" {
		return fmt.Errorf("BREVO_API_KEY or SENDER_EMAIL is not set")
	}

	// โครงสร้าง JSON ของ Brevo API
	type Sender struct {
		Name  string `json:"name"`
		Email string `json:"email"`
	}
	type Recipient struct {
		Email string `json:"email"`
	}
	type BrevoRequest struct {
		Sender      Sender      `json:"sender"`
		To          []Recipient `json:"to"`
		Subject     string      `json:"subject"`
		HtmlContent string      `json:"htmlContent"`
	}

	payload := BrevoRequest{
		Sender:  Sender{Name: "Security App", Email: senderEmail},
		To:      []Recipient{{Email: to}},
		Subject: fmt.Sprintf("Security Code: %s - Ref: %s", otp, refCode),
		HtmlContent: fmt.Sprintf(`
            <h2>Your OTP Code</h2>
            <h1>%s</h1>
            <p>Reference Code: %s</p>
        `, otp, refCode),
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	// ยิง API ไปที่ Brevo (พอร์ต 443 ทะลุ Render แน่นอน)
	req, err := http.NewRequest("POST", "https://api.brevo.com/v3/smtp/email", bytes.NewBuffer(jsonData))
	if err != nil {
		return err
	}

	req.Header.Set("accept", "application/json")
	req.Header.Set("api-key", apiKey)
	req.Header.Set("content-type", "application/json")

	client := &http.Client{Timeout: 15 * time.Second} // ตั้ง Timeout เผื่อไว้
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		// อ่าน Error เผื่อว่ามีอะไรผิดพลาด จะได้รู้สาเหตุ
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("failed to send email via Brevo, status: %d, response: %s", resp.StatusCode, string(bodyBytes))
	}

	return nil
}

// 1. สำหรับ Login (ใช้แค่ User/Pass)
type LoginRequest struct {
	Username  string `json:"username"`
	Password  string `json:"password"`
	TimeLogin int64  `json:"time_login"`
	//adaptive
	TypingTime     int    `json:"typing_time"`
	HasPasted      bool   `json:"has_pasted"`
	ExperimentMode string `json:"experiment_mode"`
	MouseMoved     bool   `json:"mouse_moved"`
	BackspaceCount int    `json:"backspace_count"`
	FailedAttempts int    `json:"failed_attempts"`
}

// 2. สำหรับ Register (ต้องรับข้อมูลเยอะกว่า)
type RegisterRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
	FullName string `json:"fullname"` // เพิ่มเข้ามา
	Email    string `json:"email"`    // เพิ่มเข้ามา
}

type TwoFAResponse struct {
	Message        string `json:"message"`
	Require2FA     bool   `json:"require_2fa"`
	UserID         uint   `json:"user_id"`
	Email          string `json:"email"`  // 🛡️ Masked email for 2FA display
	Method         string `json:"method"` // email, push
	SessionID      string `json:"session_id"`
	ExperimentMode string `json:"experiment_mode"`
	RiskLevel      string `json:"risk_level"`
	CaptchaType    string `json:"captcha_type"`
	Token          string `json:"token"`
	MaskedEmail    string `json:"masked_email"`
}

type LockoutInfo struct {
	Attempts   int
	LockoutEnd time.Time
}

var LoginLockoutCache sync.Map

// RegisterHandler
func RegisterHandler(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ข้อมูลไม่ถูกต้อง"})
		return
	}

	if req.Username == "" || req.Password == "" || req.FullName == "" || req.Email == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "กรุณากรอกข้อมูลให้ครบทุกช่อง"})
		return
	}

	var existingUser database.User
	result := database.DB.Where("username = ? OR email = ?", req.Username, req.Email).First(&existingUser)
	if result.RowsAffected > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ชื่อผู้ใช้หรืออีเมลนี้ถูกใช้งานแล้ว"})
		return
	}

	// --- Password check ---
	if !isPasswordStrong(req.Password) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Password too weak",                                                                     // Error code สำหรับ Dev
			"message": "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร และประกอบด้วยตัวพิมพ์ใหญ่, ตัวพิมพ์เล็ก, และตัวเลข", // ข้อความสำหรับ User
		})
		return
	}

	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)

	newUser := database.User{
		Username: req.Username,
		Password: string(hashedPassword),
		FullName: req.FullName,
		Email:    req.Email,
		Provider: "local",
	}

	if err := database.DB.Create(&newUser).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถบันทึกข้อมูลได้"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "สมัครสมาชิกสำเร็จ!"})
}

// LogoutHandler
func LogoutHandler(c *gin.Context) {
	utils.SetSecureCookie(c, "auth_token", "", -1) // Clear the cookie
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Logged out successfully"})
}

// LoginHandler
func LoginHandler(c *gin.Context) {
	var creds LoginRequest
	if err := c.ShouldBindJSON(&creds); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload"})
		return
	}

	if val, ok := LoginLockoutCache.Load(creds.Username); ok {
		info := val.(LockoutInfo)
		// ถ้าย้อนเวลาไปดูแล้วยังไม่หมดเวลาล็อค
		if time.Now().Before(info.LockoutEnd) {
			timeLeft := int(time.Until(info.LockoutEnd).Minutes()) + 1
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": fmt.Sprintf("กรอกรหัสผิดเกินกำหนด บัญชีถูกระงับชั่วคราว กรุณาลองใหม่ในอีก %d นาที", timeLeft),
			})
			return
		}
	}

	var user database.User
	if err := database.DB.Where("username = ?", creds.Username).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(creds.Password)); err != nil {
		attempts := 1

		// ดึงประวัติเดิมมาดูว่าผิดไปกี่รอบแล้ว
		if val, ok := LoginLockoutCache.Load(creds.Username); ok {
			info := val.(LockoutInfo)
			// ถ้าเคยโดนล็อคแล้วเวลาหมดไปแล้ว ให้เริ่มนับ 1 ใหม่
			if time.Now().After(info.LockoutEnd) {
				attempts = 1
			} else {
				attempts = info.Attempts + 1
			}
		}

		lockoutEnd := time.Time{}
		// 🚨 ตั้งค่า: ผิด 3 ครั้ง ล็อค 5 นาที (แก้ตัวเลขตรงนี้ได้เลย)
		if attempts >= 5 {
			lockoutEnd = time.Now().Add(3 * time.Minute)
		}

		// อัปเดตข้อมูลลง Cache
		LoginLockoutCache.Store(creds.Username, LockoutInfo{
			Attempts:   attempts,
			LockoutEnd: lockoutEnd,
		})

		// ส่ง Error กลับไปหา Frontend
		if attempts >= 3 {
			c.JSON(http.StatusTooManyRequests, gin.H{"error": "กรอกรหัสผิดเกิน 3 ครั้ง บัญชีถูกระงับ 5 นาที"})
			return
		}

		c.JSON(http.StatusUnauthorized, gin.H{"error": "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"})
		return
	}

	LoginLockoutCache.Delete(creds.Username)

	experimentMode := creds.ExperimentMode
	if experimentMode == "" {
		experimentMode = "static" // กันเหนียวเผื่อ Frontend ลืมส่งมา
	}

	riskLevel := "static"
	captchaType := "" // ถ้าเป็น static จะปล่อยว่างไว้ให้ Frontend ไปสุ่มเอง
	require2FA := true
	var generatedToken string

	if experimentMode == "adaptive" {
		riskLevel, captchaType = CalculateRiskScore(creds)

		// กำหนดเงื่อนไข 2FA
		if riskLevel == "high" {
			require2FA = true
		} else {
			require2FA = false
		}

		// ✅ แก้เป็น: แจกให้ทั้ง low และ medium
		if riskLevel == "low" || riskLevel == "medium" {
			secret := os.Getenv("JWT_SECRET")
			token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
				"user_id": user.ID,
				"exp":     time.Now().Add(time.Hour * 24).Unix(),
			})
			if tokenString, err := token.SignedString([]byte(secret)); err == nil {
				generatedToken = tokenString
				utils.SetSecureCookie(c, "auth_token", tokenString, 3600*24)
			}
		}
	}

	// [RESEARCH LOGIC] สร้าง SessionID และเริ่มบันทึก Journey
	sessionID := uuid.New().String()
	journey := database.ResearchJourney{
		UserID:         user.ID,
		SessionID:      sessionID,
		LoginMethod:    "local",
		TimeLogin:      creds.TimeLogin, // บันทึกเวลาที่ใช้ในหน้า Login
		CurrentStage:   "login_success",
		ExperimentMode: experimentMode,
		RiskLevel:      riskLevel,
	}
	database.DB.Create(&journey)

	go syncDataToGoogleSheets(journey)

	// --- 2FA Logic ---
	method := "email"
	user.TwoFACode = ""
	user.TwoFARef = ""
	user.IsPushApproved = false
	user.TwoFAExpiry = time.Time{}
	database.DB.Save(&user)

	c.JSON(http.StatusOK, TwoFAResponse{
		Message:        "Please complete security check",
		Require2FA:     require2FA,
		UserID:         user.ID,
		Email:          maskEmail(user.Email), // 🛡️ Zero URL Footprint: Masked Email in JSON
		Method:         method,
		SessionID:      sessionID,
		ExperimentMode: experimentMode,
		RiskLevel:      riskLevel,
		CaptchaType:    captchaType,
		Token:          generatedToken,
		MaskedEmail:    maskEmail(user.Email),
	})
}

// --- เพิ่ม Handler ใหม่สำหรับตรวจ 2FA ---

type Verify2FARequest struct {
	UserID    uint   `json:"user_id"`
	OTP       string `json:"otp"` // ใช้เฉพาะ Email OTP
	TimeTaken int64  `json:"time_taken"`
}

// รวม VerifyEmailOTP และ Verify2FAHandler เป็นอันเดียว
func Verify2FAHandler(c *gin.Context) {
	var req Verify2FARequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	var user database.User
	if err := database.DB.First(&user, req.UserID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	if req.OTP == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "กรุณากรอกรหัส OTP"})
		return
	}

	// ตรวจสอบ OTP
	if user.TwoFACode == req.OTP && time.Now().Before(user.TwoFAExpiry) {

		var journey database.ResearchJourney
		database.DB.Where("user_id = ? AND current_stage != ?", user.ID, "survey_completed").
			Order("created_at desc").First(&journey)

		if journey.ID != 0 {
			journey.Time2FA = req.TimeTaken
			journey.CurrentStage = "2fa_success"
			database.DB.Save(&journey)
			go syncDataToGoogleSheets(journey)
		}

		// ผ่าน! ล้าง OTP ทิ้ง
		user.TwoFACode = ""
		user.TwoFAExpiry = time.Time{}
		database.DB.Save(&user)

		// 1. เตรียม Secret Key
		secret := os.Getenv("JWT_SECRET")

		// 2. สร้าง JWT Token อายุ 24 ชั่วโมง
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
			"user_id": user.ID,
			"exp":     time.Now().Add(time.Hour * 24).Unix(),
		})

		tokenString, err := token.SignedString([]byte(secret))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not generate token"})
			return
		}

		// 3. ตั้งค่า HttpOnly Cookie ระดับ Production
		utils.SetSecureCookie(c, "auth_token", tokenString, 3600*24)

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "Login Success!",
			"user":    user.Username,
			"token":   tokenString,
		})
	} else {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "OTP ไม่ถูกต้องหรือหมดอายุแล้ว"})
	}
}

func CheckPushStatus(c *gin.Context) {
	userID := c.Query("user_id")
	var user database.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "User not found"})
		return
	}

	if user.IsPushApproved {
		c.JSON(http.StatusOK, gin.H{"status": "approved", "success": true})
	} else {
		c.JSON(http.StatusOK, gin.H{"status": "pending"})
	}
}

func SimulatePushApprove(c *gin.Context) {
	userID := c.Query("user_id")
	var user database.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		c.String(404, "User not found")
		return
	}

	user.IsPushApproved = true
	database.DB.Save(&user)

	c.String(200, "Approved! You can close this window and check your main app.")
}

// GetUserHandler สำหรับดึงข้อมูล User พื้นฐาน (เช่น Email) ไปโชว์ที่หน้า Frontend
func GetUserHandler(c *gin.Context) {
	userIDStr := c.Param("id")

	// 🛡️ SECURITY FIX: Prevent enumeration.
	// Since 2FA is not yet complete, we don't have a JWT, but we DO have a session_id cookie
	// or an X-Session-ID header (for Brave/cross-domain support).

	sessionID, err := c.Cookie("session_id")
	if err != nil || sessionID == "" {
		// Try header fallback for Brave/Vercel-Render cross-domain setup
		sessionID = c.GetHeader("X-Session-ID")
	}

	if sessionID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: No valid session found"})
		return
	}

	var journey database.ResearchJourney
	// Find the most recent journey with this sessionID
	if err := database.DB.Where("session_id = ?", sessionID).Order("created_at desc").First(&journey).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: Session not found"})
		return
	}

	// Check if the requested ID matches the session owner's ID
	if fmt.Sprintf("%d", journey.UserID) != userIDStr {
		c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden: You can only access your own data"})
		return
	}

	var user database.User
	// ค้นหา user จาก database ด้วย ID
	if err := database.DB.First(&user, journey.UserID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// ส่งคืนเฉพาะข้อมูลที่ปลอดภัย (ห้ามส่ง Password กลับไปเด็ดขาด!)
	c.JSON(http.StatusOK, gin.H{
		"id":       user.ID,
		"username": user.Username,
		"email":    user.Email,
	})
}

// SyncTokenHandler returns the current token if the user is already authenticated via cookie.
// This allows the frontend to populate sessionStorage if needed.
func SyncTokenHandler(c *gin.Context) {
	// If it reached here, AuthMiddleware already validated the token.
	// We just need to extract it from the Request (Header or Cookie).
	code := c.Query("code")
	if code != "" {
		// ถ้ามี Code ให้ดึง Token ออกมาจาก Memory และลบตั๋วทิ้งทันที (One-time use)
		if val, exists := TokenCache.LoadAndDelete(code); exists {
			ticket := val.(syncTicket)
			if time.Now().Before(ticket.expiresAt) {
				tokenString := ticket.token
				// ส่ง Token กลับไปให้ Frontend ถมลง Cookie ของตัวเอง
				c.JSON(http.StatusOK, gin.H{"token": tokenString, "email": ticket.email})
				return
			}
		}
	}

	var tokenString string
	authHeader := c.GetHeader("Authorization")
	if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
		tokenString = strings.TrimPrefix(authHeader, "Bearer ")
	}

	// ถ้าไม่มีใน Header ลองหาใน Cookie
	if tokenString == "" {
		cookieToken, err := c.Cookie("auth_token")
		if err == nil {
			tokenString = cookieToken
		}
	}

	// ❌ ลบบล็อกที่เอา SessionID ไปค้น Database แล้วเสก JWT ใหม่ออกไปแล้ว ❌

	// ถ้ายังไม่มี Token แสดงว่ายังล็อกอินไม่สมบูรณ์ หรือ Cookie หลุด
	if tokenString == "" {
		c.JSON(http.StatusOK, gin.H{"token": "", "status": "waiting_for_2fa_or_sso"})
		return
	}

	// ส่งคืน Token ให้ Frontend เอาไปใช้งาน
	c.JSON(http.StatusOK, gin.H{
		"token": tokenString,
	})
}

func CalculateRiskScore(req LoginRequest) (string, string) {
	score := 0
	reason := ""

	// 1. เมาส์ไม่ขยับ และ ไม่มีการกดคีย์บอร์ดเลย (บอท 100%)
	if !req.MouseMoved {
		score += 50
		reason += "[No Mouse/Key] "
	}

	// 2. พิมพ์เสร็จเร็วผิดมนุษย์ (< 0.5 วิ)
	// *แต่ถ้าเขา HasPasted ด้วย แปลว่าเขาใช้ Autofill ไม่ใช่บอท ให้ยกเว้นไว้
	if req.TypingTime > 0 && req.TypingTime < 500 && !req.HasPasted {
		score += 30
		reason += "[Fast Typing] "
	}

	// 3. วางรหัสผ่าน (HasPasted)
	// ลดแต้มลงเหลือ 15 เพราะคนปกติก็ใช้ Password Manager กันเยอะ
	if req.HasPasted {
		score += 15
		reason += "[Pasted] "
	}

	// 4. ลบแก้รหัสผ่านบ่อย (เดารหัส หรือสับสน)
	if req.BackspaceCount > 3 {
		score += 20
		reason += "[Backspace > 3] "
	}

	if req.FailedAttempts > 0 {
		// ผิด 1 ครั้ง โดน 15 แต้ม / ผิด 2 ครั้ง โดน 30 แต้ม / ผิด 3 ครั้ง โดน 45 แต้ม
		score += req.FailedAttempts * 15
		reason += fmt.Sprintf("[Failed Logins: %d] ", req.FailedAttempts)
	}

	// 🕵️‍♂️ ปริ้นท์ Log ออกมาดูเลยว่าทำไมคนนี้ถึงได้แต้มเท่านี้!
	fmt.Printf("\n--- [ADAPTIVE CALCULATION] ---\n")
	fmt.Printf("Total Score: %d | Reasons: %s\n", score, reason)

	// ประเมินระดับความเสี่ยงจากคะแนนรวม
	if score >= 50 {
		fmt.Printf("Result: HIGH RISK\n------------------------------\n")
		challenges := []string{"math", "text"}
		selectedChallenge := challenges[rand.Intn(len(challenges))]
		return "high", selectedChallenge

	} else if score >= 20 {
		fmt.Printf("Result: MEDIUM RISK\n------------------------------\n")
		challenges := []string{"slider", "cloudflare"}
		selectedChallenge := challenges[rand.Intn(len(challenges))]
		return "medium", selectedChallenge
	}

	// เสี่ยงต่ำ (Low Risk): พฤติกรรมมนุษย์ปกติ ให้ผ่านฉลุย
	fmt.Printf("Result: LOW RISK\n------------------------------\n")
	return "low", "none"
}
