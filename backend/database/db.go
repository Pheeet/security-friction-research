// database/db.go
package database

import (
	"fmt"
	"log"
	"os"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

//ตารางเก็ฐข้อมูล

type ResearchLog struct {
	ID          uint   `gorm:"primaryKey"`
	SessionID   string `json:"session_id"` //ตรวจว่าคนเดิมทำซ้ำมั้ย
	CaptchaID   string `json:"captcha_id"`
	CaptchaType string `json:"captcha_type"`
	UserInput   string `json:"user_input"`
	IsCorrect   bool   `json:"is_correct"`
	TimeTaken   int64  `json:"time_taken"`
	CreatedAt   time.Time
}

type ResearchJourney struct {
	gorm.Model
	UserID      uint   `json:"user_id"`
	SessionID   string `json:"session_id"` // เอาไว้ผูกกับตอน Login
	LoginMethod string `json:"login_method"`

	// --- เก็บเวลาแต่ละด่าน (มิลลิวินาที) ---
	TimeLogin   int64  `json:"time_login"`
	TimeCaptcha int64  `json:"time_captcha"`
	CaptchaType string `json:"captcha_type"`
	Time2FA     int64  `json:"time_2fa"`

	// --- สถานะเพื่อดูว่าคน "ถอดใจ" ที่ด่านไหน (Drop-off tracking) ---
	CurrentStage   string `json:"current_stage"`
	ExperimentMode string `json:"experiment_mode"`
	RiskLevel      string `json:"risk_level"`

	// --- คะแนนแบบสอบถาม (0-5) ---
	Q1       int    `json:"q1"`
	Q2       int    `json:"q2"`
	Q3       int    `json:"q3"`
	Q4       int    `json:"q4"`
	Q5       int    `json:"q5"`
	AgeGroup string `gorm:"type:varchar(20)"` // เก็บเป็น string ตามช่วงอายุ เช่น "18-24"
	Gender   string `gorm:"type:varchar(20)"` // เก็บเป็น "Male", "Female", "Other", "None"
}

type User struct {
	gorm.Model        // เพิ่ม ID, CreatedAt, UpdatedAt, DeletedAt ให้อัตโนมัติ
	Username   string `gorm:"uniqueIndex;not null" json:"username"` // ห้ามซ้ำ และห้ามว่าง
	Password   string `json:"-"`                                    // เก็บ Hash (ใส่ - เพื่อไม่ให้ส่งกลับไปหน้าบ้าน)
	Email      string `gorm:"uniqueIndex;not null" json:"email"`    // ห้ามซ้ำ
	FullName   string `json:"fullname"`

	// รองรับ SSO ในอนาคต
	Provider   string `gorm:"default:'local'" json:"provider"` // local, google
	ProviderID string `json:"provider_id"`                     // Google ID

	// ---FIeld for 2FA ---
	TwoFACode      string    `json:"-"` // เก็บเลข OTP
	TwoFARef       string    `json:"-"` // เก็บ Ref Code (เช่น AB12)
	TwoFAExpiry    time.Time `json:"-"` // เวลาหมดอายุ OTP
	IsPushApproved bool      `json:"-"` // สถานะว่ากด Push Approve หรือยัง
}

func GetEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists && value != "" {
		return value
	}
	return fallback
}

func ConnectDB() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = fmt.Sprintf(
			"host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=Asia/Bangkok",
			GetEnv("DB_HOST", "localhost"),
			GetEnv("DB_USER", "postgres"),
			GetEnv("DB_PASSWORD", "password"),
			GetEnv("DB_NAME", "postgres"),
			GetEnv("DB_PORT", "5432"),
		)
	}

	var err error

	for i := 1; i <= 5; i++ {
		DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
		if err == nil {
			break // ถ้าต่อสำเร็จแล้ว ให้หลุดออกจากลูปทันที
		}
		log.Printf("⏳ Database not ready (Attempt %d/5)... retrying in 2 seconds", i)
		time.Sleep(2 * time.Second)
	}

	// ถ้าพยายามครบ 5 รอบแล้วยังไม่ได้ ค่อยยอมแพ้
	if err != nil {
		log.Fatal("❌ Failed to connect to database after 5 attempts: ", err)
	}

	// Configure Connection Pool for Free Tier (Neon DB)
	sqlDB, err := DB.DB()
	if err == nil {
		sqlDB.SetMaxOpenConns(10)           // Limit total connections
		sqlDB.SetMaxIdleConns(5)            // Limit idle connections
		sqlDB.SetConnMaxLifetime(time.Hour) // Recycle connections
		sqlDB.SetConnMaxIdleTime(15 * time.Minute)
	}

	log.Println("Connected to Database successfully")

	// Auto Migrate ตาราง
	DB.AutoMigrate(&ResearchLog{}, &ResearchJourney{}, &User{})
}
