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

type ResearchLog struct{
	ID 			uint 		`gorm::"primaryKey"`
	SessionID 	string 		`json:"session_id"` //ตรวจว่าคนเดิมทำซ้ำมั้ย
	CaptchaID 	string		`json:"captcha_id"`
	CaptchaType string		`json:"captcha_type"`
	UserInput 	string		`json:"user_input"`
	IsCorrect 	bool		`json:"is_correct"`
	TimeTaken	int64		`json:"time_taken"`

	CreatedAt time.Time
}

func ConnectDB(){
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=Asia/Bangkok",
		os.Getenv("DB_HOST"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"),
		os.Getenv("DB_PORT"),
	)

	var err error

	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})

	if err != nil{
		log.Fatal("Failed to connet to database: ",err)
	}

	log.Println("Connected to Database successfully")

	//สร้างตารางอัตโนมัติ
	DB.AutoMigrate(&ResearchLog{})
}