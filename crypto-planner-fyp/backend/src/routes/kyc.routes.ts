import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// KYC Submit karne ka Endpoint
router.post('/submit', async (req, res) => {
  const { userId, cnicNumber, idCardImage, id } = req.body;
    const finalUserId = userId || id;

    if (!finalUserId || !cnicNumber) {
      return res.status(400).json({ error: "User ID aur CNIC number zaroori hain!" });
    }

    try {
      // --- COOL AI FRAUD DETECTION SIMULATION ---
    if (!idCardImage || idCardImage.length < 5000) {
      return res.status(400).json({ 
        error: "AI Detection Failed: Invalid image or potential spoofing detected. Please capture a clear, live photo!" 
      });
    }
    // ------------------------------------------
      const updatedUser = await prisma.user.update({
        where: { id: finalUserId },
      data: {
        cnicNumber: cnicNumber,
        idCardImage: idCardImage || null,
        kycStatus: "PENDING" // Form submit hote hi status PENDING ho jayega
      },
    });

    res.json({ message: "KYC details submitted successfully!", user: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "KYC save karne mein koi masla aaya hai." });
  }
});

export default router;