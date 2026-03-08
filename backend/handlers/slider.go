//handlers/slider.go

package handlers

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"image/jpeg"
	"image/png"
	"math/rand"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"sync"
	"time"

	"backend-api/database"
	"backend-api/utils"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

const (
	PuzzleWidth  = 70
	PuzzleHeight = 70
	BoxWidth     = 300 //จุดแก้ขนาดรูปภาพ
	BoxHeight    = 150 //จุดแก้ขนาดรูปภาพ
)

type SliderResponse struct {
	OriginalImage string `json:"originalImage"` // รูปพื้นหลัง
	PuzzlePiece   string `json:"puzzlePiece"`   // ชิ้นจิ๊กซอว์
	Y             int    `json:"y"`             // ตำแหน่งความสูง
	Width         int    `json:"width"`         // ส่งไปด้วย
	Height        int    `json:"height"`        // ส่งไปด้วย
}

func GenerateSliderCaptcha(c *gin.Context) {
	// 1. เลือกรูปภาพแบบสุ่มจากโฟลเดอร์ assests
	var allFiles []string

	isMask := func(path string) bool {
		return filepath.Base(path) == "mask.png"
	}

	if files, err := filepath.Glob("assets/*.png"); err == nil {
		for _, f := range files {
			if !isMask(f) {
				allFiles = append(allFiles, f)
			}
		}
	}
	if files, err := filepath.Glob("assets/*.jpg"); err == nil {
		allFiles = append(allFiles, files...)
	}
	if files, err := filepath.Glob("assets/*.jpeg"); err == nil {
		allFiles = append(allFiles, files...)
	}

	if len(allFiles) == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "No images found in assets folder"})
		return
	}

	rand.Seed(time.Now().UnixNano())
	randomFile := allFiles[rand.Intn(len(allFiles))]

	// 2. เปิดไฟล์แล้วอ่านรูปภาพ
	file, err := os.Open(randomFile)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open image"})
		return
	}
	defer file.Close()

	//decode image
	img, _, err := image.Decode(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode image"})
		return
	}

	resizedImg := image.NewRGBA(image.Rect(0, 0, BoxWidth, BoxHeight))
	draw.Draw(resizedImg, resizedImg.Bounds(), img, image.Point{0, 0}, draw.Src)
	img = resizedImg // ตอนนี้ img คือรูปที่ย่อขนาดแล้ว (300x150)

	// -----------------------------------------------------------
	// 3. โหลด Mask และคำนวณตำแหน่ง (ทำแค่รอบเดียวพอ)
	// -----------------------------------------------------------
	var maskImg image.Image
	maskFile, err := os.Open("assets/mask.png") // ต้องมั่นใจว่า path ถูก
	if err == nil {

		defer maskFile.Close() // อย่าลืม defer close
		maskImg, _, _ = image.Decode(maskFile)
		fmt.Println("LOAD MASK SUCCESS!")
	} else {
		fmt.Println("Warning: mask.png not found, using rectangle fallback.")
	}

	bounds := img.Bounds()
	maxX := bounds.Dx() - PuzzleWidth
	maxY := bounds.Dy() - PuzzleHeight

	if maxX <= 0 || maxY <= 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Image is too small"})
		return
	}

	// สุ่มตำแหน่ง X,Y
	targetX := rand.Intn(maxX-60) + 30
	targetY := rand.Intn(maxY)

	// -----------------------------------------------------------
	// 4. ตัดชิ้นจิ๊กซอว์ (The Piece)
	// -----------------------------------------------------------
	pieceImg := image.NewRGBA(image.Rect(0, 0, PuzzleWidth, PuzzleHeight))

	if maskImg != nil {
		// ใช้ Mask: ตัดรูปจาก img ตรงตำแหน่ง targetX,Y ให้เป็นทรงจิ๊กซอว์
		draw.DrawMask(pieceImg, pieceImg.Bounds(), img, image.Point{targetX, targetY}, maskImg, image.Point{0, 0}, draw.Over)
	} else {
		// Fallback: ตัดสี่เหลี่ยมธรรมดา
		draw.Draw(pieceImg, pieceImg.Bounds(), img, image.Point{targetX, targetY}, draw.Src)
	}

	// -----------------------------------------------------------
	// 5. เจาะรูที่พื้นหลัง (The Hole)
	// -----------------------------------------------------------
	bgImg := image.NewRGBA(bounds)
	draw.Draw(bgImg, bounds, img, image.Point{0, 0}, draw.Src) // วาดรูปเต็มก่อน

	// สร้างสีดำโปร่งแสงสำหรับเงา
	shadowColor := &image.Uniform{color.RGBA{0, 0, 0, 150}}

	// พื้นที่ที่จะวาดเงา (ตรงตำแหน่ง targetX, targetY)
	rect := image.Rect(targetX, targetY, targetX+PuzzleWidth, targetY+PuzzleHeight)

	if maskImg != nil {
		// ใช้ Mask: วาดเงาดำทับลงไปตามทรงจิ๊กซอว์
		draw.DrawMask(bgImg, rect, shadowColor, image.Point{}, maskImg, image.Point{0, 0}, draw.Over)
	} else {
		// Fallback: วาดสี่เหลี่ยมเทา
		draw.Draw(bgImg, rect, shadowColor, image.Point{}, draw.Over)
	}

	// 6. แปลงรูปภาพทั้งสองเป็น base64
	bgBase64 := imgToBase64(bgImg)
	pieceBase64 := imgToPNGBase64(pieceImg)

	// 7. ใช้ UserID เป็น Key ในการจำคำตอบแทน Session
	userID := c.Query("userId")
	if userID == "" {
		userID = "UnknownUser" // กันเหนียว
	}

	// 👇 เติมบรรทัดนี้ลงไปเพื่อดูว่าเซฟลง Memory ถูกไหม
	fmt.Printf("[GENERATE] UserID: %s | Target X (เป้าหมาย): %d\n", userID, targetX)

	StoreSliderAnswer(userID, targetX) // เซฟคำตอบโดยผูกกับ userID

	c.JSON(http.StatusOK, SliderResponse{
		OriginalImage: bgBase64,
		PuzzlePiece:   pieceBase64,
		Y:             targetY,
		Width:         BoxWidth,
		Height:        BoxHeight,
	})
}

func imgToBase64(img image.Image) string {
	var buf bytes.Buffer
	// Quality 90 กำลังดี ชัดและไม่ใหญ่เกินไป
	jpeg.Encode(&buf, img, &jpeg.Options{Quality: 90})
	return "data:image/jpeg;base64," + base64.StdEncoding.EncodeToString(buf.Bytes())
}

func imgToPNGBase64(img image.Image) string {
	var buf bytes.Buffer
	png.Encode(&buf, img) // 👈 ใช้ PNG แทน JPEG
	return "data:image/png;base64," + base64.StdEncoding.EncodeToString(buf.Bytes())
}

// จำคำตอบ Inmemory
var (
	sliderAnswers = make(map[string]int)
	sliderMu      sync.RWMutex
)

func StoreSliderAnswer(sessionID string, answer int) {
	sliderMu.Lock()
	defer sliderMu.Unlock()
	sliderAnswers[sessionID] = answer
}

func VerifySliderAnswer(sessionID string, userAnswer int) bool {
	sliderMu.Lock()
	defer sliderMu.Unlock()
	correctX, exists := sliderAnswers[sessionID]

	// 👇 เติมบรรทัดนี้ลงไปเพื่อดูว่าหาคำตอบเจอไหม และค่าที่ส่งมาคืออะไร
	fmt.Printf("[VERIFY] UserID: %s | เจอคำตอบไหม?: %v | คำตอบที่ถูก: %d | User ลากมาที่: %d\n", sessionID, exists, correctX, userAnswer)

	if !exists {
		return false
	}

	delete(sliderAnswers, sessionID) // ลบทิ้งทันทีหลังตรวจ

	maxMovableBackend := float64(BoxWidth - PuzzleWidth)
	correctPercentage := (float64(correctX) / maxMovableBackend) * 100.0

	// รับค่ามาเป็น % แล้ว เอามาเทียบได้เลย
	userPercentage := float64(userAnswer)

	diff := correctPercentage - userPercentage
	if diff < 0 {
		diff = -diff
	}

	return diff <= 7.0
}

type SliderVerifyRequest struct {
	UserID    string `json:"userId"`
	X         int    `json:"x"`
	TimeTaken int64  `json:"timeTaken"`
}

func VerifySlider(c *gin.Context) {
	var req SliderVerifyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// 1. ดึง Session ID (แค่เอาไว้เก็บลง Database เฉยๆ ไม่ได้ใช้ตรวจคำตอบแล้ว)
	sessionStr := "UnknownSession"
	if sessionID, exists := c.Get("research_session_id"); exists {
		sessionStr = sessionID.(string)
	}

	// 2. ตรวจคำตอบ โดยใช้ req.UserID แทน (แม่นยำ 100% ข้ามโดเมนได้)
	isCorrect := VerifySliderAnswer(req.UserID, req.X)

	// 3. บันทึกลง Database
	database.DB.Create(&database.ResearchLog{
		SessionID:   sessionStr,
		CaptchaType: "slider",
		CaptchaID:   "generated",
		UserInput:   fmt.Sprintf("%d", req.X),
		IsCorrect:   isCorrect,
		TimeTaken:   req.TimeTaken,
	})

	// 4. ส่งผลลัพธ์กลับ
	if isCorrect {
		// [RESEARCH LOGIC] อัปเดต Journey หลัก
		var journey database.ResearchJourney
		uid, _ := strconv.ParseUint(req.UserID, 10, 32)

		database.DB.Where("user_id = ? AND current_stage = ?", uint(uid), "login_success").
			Order("created_at desc").First(&journey)

		if journey.ID != 0 {
			journey.TimeCaptcha = req.TimeTaken
			journey.CaptchaType = "slider"
			journey.CurrentStage = "captcha_success"
			database.DB.Save(&journey)
			go syncDataToGoogleSheets(journey)

			if journey.RiskLevel == "medium" {
				secret := os.Getenv("JWT_SECRET")
				token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
					"user_id": uint(uid),
					"exp":     time.Now().Add(time.Hour * 24).Unix(),
				})
				if tokenString, err := token.SignedString([]byte(secret)); err == nil {
					utils.SetSecureCookie(c, "auth_token", tokenString, 3600*24)
				}
			}
		}

		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Correct!"})
	} else {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "Incorrect!"})
	}
}
