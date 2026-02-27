package handlers

import (
	"backend-api/database"
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
)

// โครงสร้างรับข้อมูลจากหน้า Survey
type SurveyRequest struct {
	Q1 int `json:"q1"`
	Q2 int `json:"q2"`
	Q3 int `json:"q3"`
	Q4 int `json:"q4"`
	Q5 int `json:"q5"`
}

func SubmitSurveyHandler(c *gin.Context) {
	// 1. ดึง UserID จาก Context (ที่ AuthMiddleware เซ็ตไว้ให้)
	val, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: No user session found"})
		return
	}
	userID := uint(val.(float64)) // JWT มักจะเก็บตัวเลขเป็น float64

	var req SurveyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid survey data"})
		return
	}

	// 2. ค้นหา Journey ล่าสุดที่ทำ 2FA สำเร็จแล้วแต่ยังไม่ได้ทำ Survey
	var journey database.ResearchJourney
	err := database.DB.Where("user_id = ? AND current_stage = ?", userID, "2fa_success").
		Order("created_at desc").First(&journey).Error

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "No active research journey found for this user"})
		return
	}

	// 3. บันทึกคะแนนลง Database
	journey.Q1 = req.Q1
	journey.Q2 = req.Q2
	journey.Q3 = req.Q3
	journey.Q4 = req.Q4
	journey.Q5 = req.Q5
	journey.CurrentStage = "survey_completed"
	database.DB.Save(&journey)

	// 🚀 4. [MAGIC] ยิงข้อมูลทั้งหมดเข้า Google Sheets แบบเบื้องหลัง (Goroutine)
	go syncDataToGoogleSheets(journey)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "ขอบคุณสำหรับข้อมูล! งานวิจัยบันทึกเรียบร้อยแล้ว",
	})
}

// ฟังก์ชันช่วยยิงข้อมูลออกไปภายนอก
func syncDataToGoogleSheets(j database.ResearchJourney) {
	scriptURL := os.Getenv("GOOGLE_SCRIPT_URL")
	if scriptURL == "" {
		fmt.Println("⚠️ Missing GOOGLE_SCRIPT_URL in .env")
		return
	}

	loc, err := time.LoadLocation("Asia/Bangkok")
	var timeStr string
	if err != nil {
		// ถ้าโหลดโซนเวลาไม่สำเร็จ (เช่น Server ไม่มีไฟล์โซนเวลา) ให้ใช้เวลาเครื่องไปก่อน
		timeStr = time.Now().Format("2006-01-02 15:04:05")
	} else {
		// แปลงเวลาปัจจุบันให้อยู่ในโซนกรุงเทพฯ
		timeStr = time.Now().In(loc).Format("2006-01-02 15:04:05")
	}

	// รวบรวม Data ชุดสมบูรณ์
	payload := map[string]interface{}{
		"timestamp":     timeStr,
		"user_id":       j.UserID,
		"session_id":    j.SessionID,
		"login_method":  j.LoginMethod,
		"time_login":    j.TimeLogin,
		"time_captcha":  j.TimeCaptcha,
		"captcha_type":  j.CaptchaType,
		"time_2fa":      j.Time2FA,
		"q1":            j.Q1,
		"q2":            j.Q2,
		"q3":            j.Q3,
		"q4":            j.Q4,
		"q5":            j.Q5,
		"current_stage": j.CurrentStage,
	}

	jsonPayload, _ := json.Marshal(payload)

	// ยิง POST ไปที่ Apps Script
	resp, err := http.Post(scriptURL, "application/json", bytes.NewBuffer(jsonPayload))
	if err != nil {
		fmt.Printf("❌ Sync to Google Sheets failed: %v\n", err)
		return
	}
	defer resp.Body.Close()
	fmt.Println("Data synced to Google Sheets successfully!")
}
