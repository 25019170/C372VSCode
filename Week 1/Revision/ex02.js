const paymentStatus = "APPROVED";

if (paymentStatus === "APPROVED") {
    console.log("Payment successful!");
} else if (paymentStatus === "PENDING") {
    console.log("Payment is pending. Please wait for confirmation.");
} else if (paymentStatus === "DECLINED") {
    console.log("Payment declined. Please check your payment details.");
} else {
    console.log("Invalid payment status.");
}