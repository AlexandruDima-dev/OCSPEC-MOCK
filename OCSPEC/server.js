const express = require("express")
const erl = require("express-rate-limit")
const app = express()
const Database = require("better-sqlite3")
const path = require("path")
const qrcode = require("qrcode")
const nodemailer = require("nodemailer")
const PORT = 8000

//Advanced Middleware

const limiter = erl.rateLimit({
	windowMs: 15 * 60 * 1000, 
	limit: 100, 
	standardHeaders: 'draft-8', 
	legacyHeaders: false, 
	ipv6Subnet: 56, 
})

const logger = (req, res, next)=>{
    const userhostname = `User Hostname: ${req.hostname}`
    const userpath = `User Path: ${req.originalUrl}`
    console.log(userhostname)
    console.log(userpath)
    next()
}

//Middlewear
app.use(express.urlencoded({extended:true}));
app.use(express.json())
app.use(express.static("public"));
app.use(logger);
app.use(limiter);

//DATA BASE SETUP
const db = new Database("users.db")

db.prepare(`

    CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firstName TEXT,
    lastName TEXT,
    email TEXT UNIQUE,
    password TEXT
    )
    
    
    `).run()
    console.log("Database is Ready")

    db.prepare(`
    CREATE TABLE IF NOT EXISTS educational_visits(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    email TEXT UNIQUE NOT NULL,
    school TEXT NOT NULL,
    visit_date TEXT,
    token TEXT UNIQUE,
    FOREIGN KEY (user_id) REFERENCES users(id)
    )`).run()

    db.prepare(`
        CREATE TABLE IF NOT EXISTS hotel_bookings(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        email TEXT UNIQUE NOT NULL,
        school TEXT NOT NULL,
        startdate TEXT,
        enddate TEXT,
        token TEXT UNIQUE,
        FOREIGN KEY (user_id) REFERENCES users(id)

        )
        `).run()



//REGISTER
app.post("/dashboard", (req,res)=>{
    try{
        const { firstName, lastName, email, password} = req.body
        db.prepare("INSERT INTO users (firstName , lastName, email, password) VALUES (?,?,?,?)").run(firstName, lastName, email, password)
        console.log(`First name: ${firstName}, Last name: ${lastName}, email:${email}, password: ${password}`)
        res.redirect("/dashboard")
    } catch (err){
        console.log(`Error has been found ${err}`)
        res.status(500).send("There Has been a Server error ")
    }
})

app.get("/dashboard" , (req,res)=>{
    res.sendFile(path.join(__dirname, "public", "dashboard.html"))
})

// SIGN IN
app.get("/signin", (req,res)=>{
    res.sendFile(path.join(__dirname, "public", "signin.html"))
})


app.post("/signin", (req,res)=>{
    const {emailInput, passwordInput} = req.body;
    if(!emailInput || !passwordInput){
        res.status(400).json({
            message:"Your Infomation hasnt been found"
        });
    };
    const user = db.prepare(
        "SELECT * FROM users WHERE email = ? AND password= ?"
    ).get(emailInput,passwordInput)

    if(user){
        res.redirect("/dashboard")
    }else{
        res.status(400).json({
            message: "email or password is invalid"
        });
    };

});

//Booking

app.get("/Booking", (req,res)=>{
    res.sendFile(path.join(__dirname, "public", "booking_complete.html"))
})

//Educational Visits

app.get("/Educational-Visits", (req,res)=>{
    res.sendFile(path.join(__dirname, "public", "educational.html"))
})

app.post("/Educational-Visits", async (req,res)=>{


        const {email , school, visit_date} = req.body;
        if(!email || !school || !visit_date){
            return res.status(401).json({
                message:"Data Hasnt been found"
            });
        };

        const token = crypto.randomUUID(); //<--- Generates Random Token


        try{
            const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email)
            if(!user){
                res.status(400).json({
                    message:"Coudnt get user"
                })
            }

            const user_id = user.id;


            db.prepare("INSERT INTO educational_visits (email, school, visit_date, token, user_id) VALUES (?,?,?,?,?)").run(email, school, visit_date, token,user_id)
        } catch(err){
            return res.status(500).json({
                message:"There Has Been a server error"
            })
        }

        const qr = await qrcode.toBuffer(`http://localhost:8000/Booking/${token}`) //<-------------- Makes QR code

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth:{user: "alexandrucoding08@gmail.com", pass:"mknr sjyw oqcz cugv"}
        });

        await transporter.sendMail({
            from: "alexandrucoding08@gmail.com",
            to: email,
            subject: "Your Educational Visit Has Been Booked!",
            text:"Thank You for our booking, if your organisation dosent arrive within an hour then booking will be cancled.",
            attachments:[{
                filename:"Your_QR_Code.png",
                content:qr
            }]
        });

        return res.status(200).redirect("/Booking")


});

// Hotel Booking

app.get("/Hotel", (req,res)=>{
    res.sendFile(path.join(__dirname, "public", "hotel.html" ))
})

app.post("/Hotel", async (req,res)=>{
    const {email, Hotel, people, startdate, enddate} = req.body;
    if(!email || !Hotel || !people || !startdate || !enddate){
        res.status(401).json({message: "We couldnt find your  infomation"})
    };

    const token = crypto.randomUUID();

    try{
    const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email)
    if(!user){
        res.status(400).json({
            message:"Coudnt get user"
        })
    }

    const user_id = user.id;


    db.prepare("INSERT INTO hotel_bookings (email, Hotel, people, startdate, enddate, user_id, token) VALUES (?,?,?,?,?)").run(email, Hotel, people, startdate, enddate, user_id,token )
} catch(err){
    return res.status(500).json({
        message:"There Has Been a server error"
    });
};


qr = await qrcode.toBuffer(`http//localhost:8000/${token}`)

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth:{user: "alexandrucoding08@gmail.com", pass:"mknr sjyw oqcz cugv"}
    });

    await transporter.sendMail({
        from: "alexandrucoding08@gmail.com",
        to: email,
        subject: "Your Room Has Been Has Been Booked!",
        text:"Thank You for our booking, if  you  dosent arrive within an hour then booking will be cancled.",
        attachments:[{
            filename:"Your_QR_Code.png",
            content:qr
        }]
    });

    return res.status(200).redirect("/Booking")

})





//Start the server
app.listen(PORT, ()=>{
    console.log("Server is running at: http://localhost:8000")

})
