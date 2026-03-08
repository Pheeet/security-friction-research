//handlers/captcha.go

package handlers

import (
	"backend-api/database"
	"fmt"
	"image/color"
	"net/http"
	"os"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang/freetype/truetype"

	"github.com/mojocn/base64Captcha"
)

// ใช้ sync.Map เป็น key => value
// key = capchaId, value

// --- Structs ---
type DiskFontStore struct{}

// ฟังก์ชันนี้จะถูก Library เรียกใช้อัตโนมัติเมื่อเราส่ง DiskFontStore เข้าไป
func (s *DiskFontStore) LoadFontByName(name string) *truetype.Font {
	// Library จะส่ง name มาเป็น "fonts/Roboto" (มันเติม prefix fonts/ ให้เอง)
	// เราต้องเติม .ttf ให้มัน
	filename := "fonts/" + name + ".ttf"

	// อ่านไฟล์
	fontBytes, err := os.ReadFile(filename)
	if err != nil {
		// ลองอีก path เผื่อ library ส่งมาเป็น fonts/Roboto อยู่แล้ว
		filename = name + ".ttf"
		fontBytes, err = os.ReadFile(filename)
		if err != nil {
			fmt.Printf("Error loading font file: %s (Check if 'fonts/Roboto.ttf' exists)\n", filename)
			panic(err)
		}
	}

	font, err := truetype.Parse(fontBytes)
	if err != nil {
		panic(err)
	}
	return font
}

func (s *DiskFontStore) LoadFontsByNames(names []string) []*truetype.Font {
	var fonts []*truetype.Font
	for _, name := range names {
		// เรียกใช้ฟังก์ชันโหลดทีละตัวที่เราเขียนไว้แล้ว
		f := s.LoadFontByName(name)
		fonts = append(fonts, f)
	}
	return fonts
}

type captchaItem struct {
	value     string
	expiresAt time.Time
}

type CaseSensitiveStore struct {
	sync.Map // ใช้ sync.Map เก็บข้อมูล (Thread-safe)
	once     sync.Once
}

func (s *CaseSensitiveStore) startCleanup() {
	go func() {
		for {
			time.Sleep(5 * time.Minute)
			s.Map.Range(func(key, value interface{}) bool {
				item := value.(captchaItem)
				if time.Now().After(item.expiresAt) {
					s.Map.Delete(key)
				}
				return true
			})
		}
	}()
}

// Set เก็บคำตอบลง Memory
func (s *CaseSensitiveStore) Set(id string, value string) error {
	s.once.Do(s.startCleanup)
	s.Map.Store(id, captchaItem{
		value:     value,
		expiresAt: time.Now().Add(10 * time.Minute), // 🛡️ TTL: 10 Minutes
	})
	return nil
}

// Get: ดึงคำตอบ (และลบทิ้งถ้า clear=true)
func (s *CaseSensitiveStore) Get(id string, clear bool) string {
	val, ok := s.Map.Load(id)
	if !ok {
		return ""
	}
	item := val.(captchaItem)
	if time.Now().After(item.expiresAt) {
		s.Map.Delete(id)
		return ""
	}
	if clear {
		s.Map.Delete(id)
	}
	return item.value
}

func (s *CaseSensitiveStore) Verify(id, answer string, clear bool) bool {
	v := s.Get(id, clear)
	// ใช้==ตรงๆ แทน strings.EqualFold เพื่อให้ A != a
	return v == answer
}

var Store = &CaseSensitiveStore{}
var FontStore = &DiskFontStore{}

type VerifyRequest struct {
	UserID      string `json:"userId"`
	CaptchaID   string `json:"captchaId"`
	CaptchaType string `json:"captchaType"`
	Answer      string `json:"answer"` //base 64
	TimeTaken   int64  `json:"timeTaken"`
}

func GenerateCaptcha(c *gin.Context) {
	// รับค่า type จาก URL (default = text)
	captchaType := c.DefaultQuery("type", "text")

	var driver base64Captcha.Driver

	if captchaType == "math" {
		// --- แบบ Math (สมการเลข) ---
		driver = base64Captcha.NewDriverMath(
			60,
			240,
			15,
			base64Captcha.OptionShowSlimeLine,
			&color.RGBA{0, 0, 0, 0},
			FontStore,
			[]string{"Roboto"},
		)
	} else {
		// --- แบบ Text (ตัวอักษร) ---
		driver = base64Captcha.NewDriverString(
			60,
			240,
			30,
			base64Captcha.OptionShowSineLine,
			4,
			"123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz",
			&color.RGBA{0, 0, 0, 0},
			FontStore,
			[]string{"Roboto"},
		)
	}

	// สร้าง Captcha
	cpt := base64Captcha.NewCaptcha(driver, Store)
	id, b64s, _, err := cpt.Generate()

	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to generate captcha"})
		return
	}

	// ส่งกลับ Frontend
	c.JSON(http.StatusOK, gin.H{
		"captchaId": id,
		"image":     b64s,
		"type":      captchaType,
	})
}

func VerifyCaptcha(c *gin.Context) {
	var req VerifyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request"})
		return
	}

	// บันทึกลง Database True and false
	isCorrect := Store.Verify(req.CaptchaID, req.Answer, true)
	sessionID, _ := c.Get("research_session_id")
	sessIDStr := "Unknown"
	if s, ok := sessionID.(string); ok {
		sessIDStr = s
	}
	database.DB.Create(&database.ResearchLog{
		SessionID:   sessIDStr, // <--- บันทึกลง DB ตรงนี้
		CaptchaID:   req.CaptchaID,
		CaptchaType: req.CaptchaType,
		UserInput:   req.Answer,
		IsCorrect:   isCorrect,
		TimeTaken:   req.TimeTaken,
	})

	if !isCorrect {

		c.JSON(http.StatusOK, gin.H{"success": false, "message": "Incorrect!"})
		return
	}
	var journey database.ResearchJourney
	uid, _ := strconv.ParseUint(req.UserID, 10, 32)

	database.DB.Where("user_id = ? AND current_stage = ?", uint(uid), "login_success").
		Order("created_at desc").First(&journey)
	if journey.ID != 0 {
		journey.TimeCaptcha = req.TimeTaken
		journey.CaptchaType = req.CaptchaType
		journey.CurrentStage = "captcha_success" // เปลี่ยนสถานะเพื่อไปต่อด่าน 2FA
		database.DB.Save(&journey)
		go syncDataToGoogleSheets(journey)
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Correct!"})
}
