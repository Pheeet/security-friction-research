package handlers

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"image/jpeg"
	_ "image/png"
	"math/rand"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"backend-api/database"

	"github.com/gin-gonic/gin"
)

const (
	PuzzleWidth  = 50
	PuzzleHeight = 50
	BoxWidth     = 300 //จุดแก้ขนาดรูปภาพ
	BoxHeight    = 150 //จุดแก้ขนาดรูปภาพ
)

type SliderResponse struct {
	OriginalImage string `json:"originalImage"` // รูปพื้นหลัง
	PuzzlePiece   string `json:"puzzlePiece"`   // ชิ้นจิ๊กซอว์
	Y             int    `json:"y"`             // ตำแหน่งความสูง
	Width  int `json:"width"`  // ส่งไปด้วย
    Height int `json:"height"` // ส่งไปด้วย
}

func GenerateSliderCaptcha(c *gin.Context) {
	// 1. เลือกรูปภาพแบบสุ่มจากโฟลเดอร์ assests
	var allFiles []string
	if files, err := filepath.Glob("assets/*.png"); err == nil {
		allFiles = append(allFiles, files...)
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
	img = resizedImg

	//3. สุ่มตำแหน่ง X,Y สำหรับชิ้นจิ๊กซอว์
	bounds := img.Bounds()
	maxX := bounds.Dx() - PuzzleWidth
	maxY := bounds.Dy() - PuzzleHeight

	if maxX <= 0 || maxY <= 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Image is too small"})
		return
	}

	targetX := rand.Intn(maxX-60) + 30 // เว้นขอบซ้ายขวา 50px
	targetY := rand.Intn(maxY)

	//4. ตัดชิ้นจิ๊กซอว์ออกจากรูปภาพ
	//สร้าง rgb ว่างๆ
	pieceImg := image.NewRGBA(image.Rect(0, 0, PuzzleWidth, PuzzleHeight))
	//copy จาก xy มาใส่
	draw.Draw(pieceImg, pieceImg.Bounds(), img, image.Point{X: targetX, Y: targetY}, draw.Src)

	//5. ทำภาพพื้นหลังให้มีรูเจาะ
	bgImg := image.NewRGBA(bounds)
	draw.Draw(bgImg, bounds, img, image.Point{0, 0}, draw.Src)
	grayColor := color.RGBA{100, 100, 100, 200}
	draw.Draw(bgImg, image.Rect(targetX, targetY, targetX+PuzzleWidth, targetY+PuzzleHeight), &image.Uniform{grayColor}, image.Point{}, draw.Over)

	//6. แปลงรูปภาพทั้งสองเป็น base64
	bgBase64 := imgToBase64(bgImg)
	pieceBase64 := imgToBase64(pieceImg)

	//7. บันทึกลง session
	sessionID, exists := c.Get("research_session_id")
	if !exists {
		sessionID = "Unknown"
	}

	StoreSliderAnswer(sessionID.(string), targetX)

	c.JSON(http.StatusOK, SliderResponse{
		OriginalImage: bgBase64,
		PuzzlePiece:   pieceBase64,
		Y:             targetY,
		Width:  BoxWidth,
    	Height: BoxHeight,
	})

}

func imgToBase64(img image.Image) string {
	var buf bytes.Buffer
	// Quality 90 กำลังดี ชัดและไม่ใหญ่เกินไป
	jpeg.Encode(&buf, img, &jpeg.Options{Quality: 90})
	return "data:image/jpeg;base64," + base64.StdEncoding.EncodeToString(buf.Bytes())
}

// จำคำตอบ Inmemory
var sliderAnswers = make(map[string]int)

func StoreSliderAnswer(sessionID string, answer int) {
	sliderAnswers[sessionID] = answer
}

func VerifySliderAnswer(sessionID string, userAnswer int) bool {
	correctX, exists := sliderAnswers[sessionID]
	if !exists {
		return false
	}
	delete(sliderAnswers, sessionID) // ลบทิ้งทันทีหลังตรวจ

	// Tolerance +/- 5 pixels
	diff := correctX - userAnswer
	if diff < 0 {
		diff = -diff
	}
	return diff <= 5
}

type SliderVerifyRequest struct {
	X         int   `json:"x"`
	TimeTaken int64 `json:"timeTaken"`
}

func VerifySlider(c *gin.Context) {
	var req SliderVerifyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// 1. ดึง Session ID
	sessionID, exists := c.Get("research_session_id")
	if !exists {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Session missing"})
		return
	}

	// 2. ตรวจคำตอบ (เรียกฟังก์ชัน Helper ที่เราเขียนไว้แล้ว)
	isCorrect := VerifySliderAnswer(sessionID.(string), req.X)

	// 3. บันทึกลง Database
	// หมายเหตุ: CaptchaID ของ Slider อาจจะไม่มี (เพราะเรา Gen สด) ใส่เป็น "slider_gen" แทนได้ครับ
	database.DB.Create(&database.ResearchLog{
		SessionID:   sessionID.(string),
		CaptchaType: "slider",
		CaptchaID:   "generated",
		UserInput:   fmt.Sprintf("%d", req.X), // เก็บค่า X ที่ User ลาก
		IsCorrect:   isCorrect,
		TimeTaken:   req.TimeTaken,
	})

	// 4. ส่งผลลัพธ์กลับ
	if isCorrect {
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Correct!"})
	} else {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "Incorrect! Try again."})
	}
}
