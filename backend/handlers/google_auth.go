package handlers

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"os"

	"backend-api/database" // import database ของคุณ

	"github.com/gin-gonic/gin"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

var googleOauthConfig *oauth2.Config

// 1. ตั้งค่า Config (ควรเรียกใช้ใน main.go หรือ init)
func InitGoogleAuth() {
	googleOauthConfig = &oauth2.Config{
		RedirectURL:  "http://localhost:8080/api/auth/google/callback",
		ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),     // ใส่ใน .env หรือ Hardcode เทสก่อนก็ได้
		ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"), // ใส่ใน .env
		Scopes:       []string{"https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"},
		Endpoint:     google.Endpoint,
	}
}

// 2. Handler สำหรับปุ่ม "Sign in with Google" (พา User ไป Google)
func GoogleLogin(c *gin.Context) {
	url := googleOauthConfig.AuthCodeURL("random-state") // state ควร gen สุ่มจริงๆ เพื่อความปลอดภัย
	c.Redirect(http.StatusTemporaryRedirect, url)
}

// 3. Handler สำหรับรับ Callback จาก Google
func GoogleCallback(c *gin.Context) {
	// รับ Code ที่ Google ส่งมา
	code := c.Query("code")

	// เอา Code ไปแลก Token
	token, err := googleOauthConfig.Exchange(context.Background(), code)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Code exchange failed"})
		return
	}

	// เอา Token ไปดึงข้อมูล User
	resp, err := http.Get("https://www.googleapis.com/oauth2/v2/userinfo?access_token=" + token.AccessToken)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "User data fetch failed"})
		return
	}
	defer resp.Body.Close()

	// อ่านข้อมูล JSON
	content, _ := io.ReadAll(resp.Body)
	var googleUser struct {
		ID      string `json:"id"`
		Email   string `json:"email"`
		Name    string `json:"name"`
		Picture string `json:"picture"`
	}
	json.Unmarshal(content, &googleUser)

	// --- LOGIC เชื่อม DATABASE ตรงนี้ ---
	var user database.User

	// เช็คว่ามี User คนนี้หรือยัง (เช็คจาก Email)
	if err := database.DB.Where("email = ?", googleUser.Email).First(&user).Error; err != nil {
		// ถ้ายังไม่มี -> สร้างใหม่ (Register)
		user = database.User{
			Username:   googleUser.Email, // ใช้ Email เป็น Username ไปก่อน
			Email:      googleUser.Email,
			FullName:   googleUser.Name,
			Provider:   "google",
			ProviderID: googleUser.ID,
			Password:   "", // SSO ไม่มี Password
		}
		database.DB.Create(&user)
	} else {
		// ถ้ามีแล้ว -> อัปเดตข้อมูล (เช่น เผื่อเปลี่ยนชื่อ)
		user.Provider = "google"
		user.ProviderID = googleUser.ID
		database.DB.Save(&user)
	}

	// TODO: สร้าง JWT Token ของเว็บเราเอง (Session)
	// ตอนนี้ให้ Redirect กลับไปหน้า Frontend ก่อน
	// c.SetCookie("token", "YOUR_JWT_TOKEN", 3600, "/", "localhost", false, true)

	c.Redirect(http.StatusTemporaryRedirect, "http://localhost:3000/")
}
