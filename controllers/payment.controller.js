import Razorpay from "razorpay";
import crypto from "crypto";
import { Campaign } from "../models/campaign.model.js";
import { asynchandler } from "../utils/asynchandler.js";
import { handleerror } from "../utils/apiError.js";
import { handleresponse } from "../utils/apiResponse.js";
import User from "../models/users.model.js";

// Initialize Razorpay
// NOTE: Ensure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are in your .env file
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ==========================================
// 1. CREATE AD CAMPAIGN ORDER
// ==========================================
export const createCampaignOrder = asynchandler(async (req, res) => {
    const { campaignId } = req.body;

    const campaign = await Campaign.findOne({ _id: campaignId, user: req.user._id });
    
    if (!campaign) {
        throw new handleerror(404, "Campaign not found");
    }
    if (campaign.paymentStatus === "completed") {
        throw new handleerror(400, "This campaign has already been paid for.");
    }

    // Razorpay requires the amount in PAISE (₹1 = 100 Paise)
    const amountInPaise = campaign.budget * 100;

    const options = {
        amount: amountInPaise,
        currency: "INR",
        receipt: `receipt_camp_${campaign._id}`,
        // You can add notes for your own dashboard tracking
        notes: {
            campaignGoal: campaign.campaignGoal,
            userId: req.user._id.toString()
        }
    };

    // Call Razorpay API to generate the Order
    const order = await razorpay.orders.create(options);

    if (!order) {
        throw new handleerror(500, "Failed to create Razorpay order");
    }

    // Save the order ID to the campaign as "pending"
    campaign.razorpayOrderId = order.id;
    await campaign.save();

    // Send the order details to the frontend to trigger the Razorpay Checkout popup
    return res.status(200).json(
        new handleresponse(200, {
            orderId: order.id,
            amount: order.amount,
            currency: order.currency
        }, "Payment order generated")
    );
});

// ==========================================
// 2. VERIFY PAYMENT & ACTIVATE CAMPAIGN
// ==========================================
export const verifyCampaignPayment = asynchandler(async (req, res) => {
    const { 
        razorpay_order_id, 
        razorpay_payment_id, 
        razorpay_signature, 
        campaignId 
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        throw new handleerror(400, "Missing payment verification details");
    }

    const campaign = await Campaign.findOne({ _id: campaignId, user: req.user._id });
    if (!campaign) throw new handleerror(404, "Campaign not found");

    // 1. The Cryptographic Signature Check (CRUCIAL FOR SECURITY)
    // We recreate the signature using our secret key to ensure nobody tampered with the payload
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    
    const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
        // If hackers try to fake a success request, it gets caught here
        campaign.paymentStatus = "failed";
        await campaign.save();
        throw new handleerror(400, "Payment verification failed. Invalid signature.");
    }

    // 2. If Authentic, mark payment as completed and ACTIVATE the ad!
    campaign.razorpayPaymentId = razorpay_payment_id;
    campaign.paymentStatus = "completed";
    campaign.isActive = true; // The Ad is now live in the Feed!
    await campaign.save();

    return res.status(200).json(
        new handleresponse(200, { 
            campaignId: campaign._id,
            isActive: campaign.isActive 
        }, "Payment successful. Your Ad is now live!")
    );
});

export const createSubscriptionOrder = asynchandler(async (req, res) => {
    const { plan } = req.body;
    
    // Set pricing logic (₹499 = 49900 paise)
    const amountInPaise = plan === "matrimony" ? 49900 : 0; 
    
    if (amountInPaise === 0) {
        throw new handleerror(400, "Invalid plan selected");
    }

    const options = {
        amount: amountInPaise,
        currency: "INR",
        receipt: `receipt_sub_${req.user._id}`,
    };

    const order = await razorpay.orders.create(options);
    if (!order) throw new handleerror(500, "Failed to create Razorpay order");

    return res.status(200).json(
        new handleresponse(200, {
            orderId: order.id,
            amount: order.amount,
            currency: order.currency
        }, "Subscription order generated")
    );
});

export const verifySubscriptionPayment = asynchandler(async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest("hex");

    if (expectedSignature !== razorpay_signature) {
        throw new handleerror(400, "Payment verification failed. Invalid signature.");
    }

    // Update user's plan in the DB since payment succeeded
    const user = await User.findById(req.user._id);
    user.plan = plan; // "matrimony"
    await user.save();

    return res.status(200).json(
        new handleresponse(200, { plan: user.plan }, "Payment successful. Welcome to Premium!")
    );
});