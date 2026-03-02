//turnstile.go

package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"time"
	_ "time"

	"backend-api/database"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

//dummy secret key for testing, replace with your own key from https://www.cloudflare.com/turnstile

type TurnstileRequest struct {
	UserID    string `json:"userId"`
	Token     string `json:"token" binding:"required"`
	TimeTaken int64  `json:"timeTaken"`
}

type TurnstileResponse struct {
	Success     bool     `json:"success"`
	ChallengeTS string   `json:"challenge_ts"`
	Hostname    string   `json:"hostname"`
	ErrorCodes  []string `json:"error-codes"`
	Action      string   `json:"action"`
	Cdata       string   `json:"cdata"`
}

func VerifyTurnstile(c *gin.Context) {
	var req TurnstileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Missing token"})
		return
	}

	if req.Token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Empty token"})
		return
	}

	secretKey := os.Getenv("TURNSTILE_SECRET_KEY")
	if secretKey == "" {
		fmt.Println("Error: TURNSTILE_SECRET_KEY is missing in .env")
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server config error"})
		return
	}
	// ส่ง Token ไปถาม cloudflare ว่าของจริงไหม
	data := url.Values{}
	data.Set("secret", secretKey)
	data.Set("response", req.Token)
	data.Set("remoteip", c.ClientIP())

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.PostForm("https://challenges.cloudflare.com/turnstile/v0/siteverify", data)

	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"success": false, "message": "Cloudflare unreachable"})
		return
	}
	defer resp.Body.Close()

	var cfRes TurnstileResponse
	if err := json.NewDecoder(resp.Body).Decode(&cfRes); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Parse error"})
		return
	}
	fmt.Printf("CF Response: %+v\n", cfRes)
	sessionID, exists := c.Get("research_session_id")
	if !exists {
		sessionID = "Unknown"
	}

	// บันทึกลง db
	database.DB.Create(&database.ResearchLog{
		SessionID:   sessionID.(string),
		CaptchaType: "cloudflare",
		CaptchaID:   "turnstile-widget",
		UserInput:   "click",
		IsCorrect:   cfRes.Success,
		TimeTaken:   req.TimeTaken,
	})
	//สงผลกับ frontend
	if cfRes.Success {
		var journey database.ResearchJourney
		// แปลง userID จาก string เป็น uint
		uid, _ := strconv.ParseUint(req.UserID, 10, 32)

		// ค้นหา Journey ล่าสุดของ User คนนี้ที่เพิ่ง Login มา
		database.DB.Where("user_id = ? AND current_stage = ?", uint(uid), "login_success").
			Order("created_at desc").First(&journey)

		if journey.ID != 0 {
			journey.TimeCaptcha = req.TimeTaken
			journey.CaptchaType = "cloudflare"
			journey.CurrentStage = "captcha_success"
			database.DB.Save(&journey)
			go syncDataToGoogleSheets(journey)

			if journey.RiskLevel == "medium" {
				secret := os.Getenv("JWT_SECRET")
				if secret == "" {
					secret = "fallback-secret-for-dev"
				}
				token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
					"user_id": uint(uid),
					"exp":     time.Now().Add(time.Hour * 24).Unix(),
				})
				if tokenString, err := token.SignedString([]byte(secret)); err == nil {
					c.SetCookie("auth_token", tokenString, 3600*24, "/", "localhost", false, true)
				}
			}
		}

		fmt.Println("Verification Success!")
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Verified!"})
	} else {
		fmt.Println("Turnstile Failed:", cfRes.ErrorCodes)
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "Verification failed!", "errors": cfRes.ErrorCodes})
	}
}
