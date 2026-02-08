package handlers

import (
	"image/color"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/mojocn/base64Captcha"
)

// ใช้ Store เก็บคำตอบใน Memory
var Store = base64Captcha.DefaultMemStore

var textDriver = base64Captcha.NewDriverString(
	80,  // สูง
	240, // กว้าง
	0,   // Noise (0=สะอาด)
	0,   // ShowLineOptions
	4,   // ความยาว
	"1234567890abcdefghijklmnopqrstuvwxyz",
	&color.RGBA{0, 0, 0, 0},
	nil,
	nil,
)

var mathDriver = base64Captcha.NewDriverMath(
	80,  // สูง
	240, // กว้าง
	0,   // Noise
	0,   // ShowLineOptions
	&color.RGBA{0, 0, 0, 0},
	nil,
	nil,
)

func GenerateCaptcha(c *gin.Context) {
	// รับค่า type จาก URL (default = text)
	captchaType := c.DefaultQuery("type", "text")

	var driver base64Captcha.Driver

	switch captchaType {
	case "math":
		driver = mathDriver
	case "text":
		driver = textDriver
	case "slider":
		// TODO: เดี๋ยวเราจะมาเติม logic Slider ทีหลัง
		c.JSON(http.StatusOK, gin.H{"type": "slider", "message": "Slider coming soon"})
		return
	case "cloudflare":
		// TODO: ส่ง Site Key กลับไป
		c.JSON(http.StatusOK, gin.H{"type": "cloudflare", "siteKey": "YOUR_SITE_KEY"})
		return
	default:
		driver = textDriver
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
