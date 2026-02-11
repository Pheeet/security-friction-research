package handlers

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	_"time"

	"backend-api/database"
	"github.com/gin-gonic/gin"
)

//dummy secret key for testing, replace with your own key from https://www.cloudflare.com/turnstile
const TURNSTILE_SECRET_KEY = "1x0000000000000000000000000000000AA"

type TurnstileRequest struct {
	Token string `json:"token"`
}

type TurnstileResponse struct {
	Success	 bool      `json:"success"`
	ChallengeTS string   `json:"challenge_ts"`
	Hostname   string   `json:"hostname"`
	ErrorCodes []string `json:"error-codes"`
}

func VerifyTurnstile(c *gin.Context){
	var req TurnstileRequest
	if err := c.ShouldBindJSON(&req); err != nil{
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// ส่ง Token ไปถาม cloudflare ว่าของจริงไหม
	formData := url.Values{}
	formData.Set("secret", TURNSTILE_SECRET_KEY)
	formData.Set("response", req.Token)

	resp, err := http.PostForm("https://challenges.cloudflare.com/turnstile/v0/siteverify", formData)
	if err != nil{
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to connect to Cloudflare"})
	}
	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)

	var cfRes TurnstileResponse
	if err := json.Unmarshal(body, &cfRes); err != nil{
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse Cloudflare response"})
		return
	}

	sessionID, exists := c.Get("research_session_id")
	if !exists {
		sessionID = "Unknown"
	}

	// บันทึกลง db
	database.DB.Create(&database.ResearchLog{
		SessionID: sessionID.(string),
		CaptchaType: "cloudflare",
		CaptchaID: "turnstile-widget",
		UserInput: "click",
		IsCorrect: cfRes.Success,
		TimeTaken: 0,
	})

	//สงผลกับ frontend
	if cfRes.Success{
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Verified!"})
	} else {
		fmt.Println("Turnstile Failed:", cfRes.ErrorCodes)
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "Verification failed!"})
	}
}