const nodemailer = require('nodemailer');

// Helper function to generate CSV content
function generateCSVContent(questions, answered, chatLog) {
    const chatLogData = [];
    chatLogData.push(["Timestamp", "Sender", "Message Type", "Content"]);
    
    chatLog.forEach(entry => {
        const messageType = entry.sender === "bot" ? 
            (entry.message.includes("Question") ? "Question" : "Bot Response") : 
            "User Response";
        chatLogData.push([
            entry.timestamp,
            entry.sender === "bot" ? "Manus (Bot)" : "User",
            messageType,
            `"${entry.message.replace(/"/g, '""')}"`
        ]);
    });
    
    chatLogData.push(["", "", "", ""]);
    chatLogData.push(["", "", "SUMMARY", "Question-Answer Pairs"]);
    chatLogData.push(["Question ID", "Question", "Answer", "Status"]);
    
    for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        const answer = answered[question.id] || "Not Answered";
        const status = answered[question.id] ? "Completed" : "Skipped/Not Reached";
        chatLogData.push([
            question.id,
            `"${question.text}"`,
            `"${String(answer).replace(/"/g, '""')}"`,
            status
        ]);
    }

    return chatLogData.map(row => row.join(",")).join("\n");
}

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST' ) {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { managerEmail, userName, userEmail, questions, answered, chatLog } = JSON.parse(event.body);

        // --- Nodemailer Configuration ---
        // We use environment variables for security, which you'll set in the Netlify UI.
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST, // e.g., 'smtp.gmail.com' or your company's SMTP server
            port: process.env.EMAIL_PORT, // e.g., 465
            secure: true, // true for 465, false for other ports
            auth: {
                user: process.env.EMAIL_USER, // Your company email address
                pass: process.env.EMAIL_PASS, // Your company email password or app-specific password
            },
        });

        // Generate the CSV content
        const csvContent = generateCSVContent(questions, answered, chatLog);
        const csvFilename = `${userEmail}.csv`;

        // --- Email Options ---
        const mailOptions = {
            from: `"Onboarding Bot" <${process.env.EMAIL_USER}>`,
            to: managerEmail,
            subject: `New Onboarding Submission from ${userName}`,
            html: `
                <h3>New Onboarding Completed!</h3>
                <p><strong>User:</strong> ${userName}</p>
                <p><strong>Email:</strong> ${userEmail}</p>
                <p><strong>Submission Date:</strong> ${new Date().toLocaleDateString()}</p>
                <p><strong>Submission Time:</strong> ${new Date().toLocaleTimeString()}</p>
                <p>The full Q&A chat log and summary are attached as a CSV file.</p>
            `,
            attachments: [
                {
                    filename: csvFilename,
                    content: csvContent,
                    contentType: 'text/csv',
                },
            ],
        };

        // Send the email
        await transporter.sendMail(mailOptions);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Email sent successfully!' }),
        };
    } catch (error) {
        console.error('Error sending email:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to send email.', error: error.message }),
        };
    }
};
