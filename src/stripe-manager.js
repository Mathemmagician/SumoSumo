// Stripe integration for SumoSumo sponsorships
class StripeManager {
    constructor() {
        this.stripe = null;
        this.sponsorBtn = null;
        
        // Initialize after DOM is loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    initialize() {
        console.log("Initializing StripeManager...");
        
        // Initialize Stripe with your publishable key
        // Replace this with your actual publishable key from Stripe dashboard
        this.stripe = Stripe('pk_test_your_publishable_key');
        
        // Get sponsor button
        this.sponsorBtn = document.getElementById('sponsor-btn');
        
        if (this.sponsorBtn) {
            console.log("Sponsor button found, adding event listener");
            this.sponsorBtn.addEventListener('click', () => this.openCheckout());
        } else {
            console.error('Sponsor button not found in the DOM');
        }
    }

    async openCheckout() {
        try {
            // Call your server to create a Checkout Session
            const response = await fetch('/create-checkout-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    // You can customize these options
                    amount: 50000, // $500.00 in cents
                    name: 'SumoSumo Sponsorship',
                    description: 'Advertise your brand on SumoSumo!'
                })
            });
            
            const session = await response.json();
            
            // Redirect to Stripe Checkout
            const result = await this.stripe.redirectToCheckout({
                sessionId: session.id
            });
            
            if (result.error) {
                console.error(result.error.message);
                // You might want to show an error to the user
            }
        } catch (error) {
            console.error('Error creating checkout session:', error);
        }
    }
}

// Export a singleton instance
export const stripeManager = new StripeManager();

// Make globally available
window.stripeManager = stripeManager; 