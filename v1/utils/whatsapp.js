const axios = require("axios");

class WhatsAppService {
  constructor() {
    this.service = process.env.WHATSAPP_SERVICE || "custom";
    this.customEndpoint = process.env.WHATSAPP_API_ENDPOINT;
    this.apiKey = process.env.WHATSAPP_API_KEY;
    this.templateName =
      process.env.WHATSAPP_TEMPLATE_NAME || "otp_verification";
    this.timeout = parseInt(process.env.WHATSAPP_TIMEOUT) || 30000;
    this.retryAttempts = parseInt(process.env.WHATSAPP_RETRY_ATTEMPTS) || 3;
    this.retryDelay = parseInt(process.env.WHATSAPP_RETRY_DELAY) || 1000;
    this.setupService();
  }

  // Setup WhatsApp service based on configuration
  setupService() {
    switch (this.service) {
      case "custom":
        this.setupCustomAPI();
        break;
      case "console":
        this.setupConsole();
        break;
      default:
        console.warn(
          `Unknown WhatsApp service: ${this.service}, falling back to console mode`
        );
        this.setupConsole();
    }
  }

  // Setup custom WhatsApp API (Facebook Graph API)
  setupCustomAPI() {
    if (!this.customEndpoint) {
      console.error(
        "Missing WhatsApp API endpoint. Falling back to console mode."
      );
      this.setupConsole();
      return;
    }

    if (this.customEndpoint.includes("graph.facebook.com")) {
      console.log("✅ Facebook Graph API configured");
      console.log(
        "⚠️  Note: Using Facebook Graph API - ensure proper network access in Railway"
      );
    } else {
      console.log("✅ Custom WhatsApp API configured");
    }
  }

  // Setup console mode for development
  setupConsole() {
    console.log("📱 Console WhatsApp service configured (for development)");
  }

  // Create configured axios instance
  createAxiosInstance() {
    return axios.create({
      timeout: this.timeout,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Stoory-Backend/1.0",
      },
      maxRedirects: 5,
      validateStatus: function (status) {
        return status >= 200 && status < 600;
      },
    });
  }

  // Retry request with exponential backoff
  async retryRequest(requestFn, maxAttempts = this.retryAttempts) {
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        console.log(`Attempt ${attempt}/${maxAttempts} failed:`, error.message);

        if (attempt < maxAttempts) {
          await new Promise((resolve) =>
            setTimeout(resolve, this.retryDelay * attempt)
          );
        }
      }
    }

    throw lastError;
  }

  // Send OTP via WhatsApp
  async sendOTP(phone, otp) {
    try {
      switch (this.service) {
        case "custom":
          return await this.sendOTPViaCustomAPI(phone, otp);
        case "console":
          return await this.sendViaConsole(phone, this.formatOTPMessage(otp));
        default:
          return await this.sendViaConsole(phone, this.formatOTPMessage(otp));
      }
    } catch (error) {
      console.error("WhatsApp OTP error:", error);
      return {
        success: false,
        message: "Failed to send WhatsApp OTP",
        error: error.message,
      };
    }
  }

  // Send welcome message via WhatsApp
  async sendWelcome(phone, userName) {
    try {
      const message = this.formatWelcomeMessage(userName);

      switch (this.service) {
        case "custom":
          return await this.sendWelcomeViaCustomAPI(phone, message);
        case "console":
          return await this.sendViaConsole(phone, message);
        default:
          return await this.sendViaConsole(phone, message);
      }
    } catch (error) {
      console.error("WhatsApp welcome message error:", error);
      return {
        success: false,
        message: "Failed to send welcome message",
        error: error.message,
      };
    }
  }

  // Send OTP via custom API (Facebook Graph API)
  async sendOTPViaCustomAPI(phone, otp) {
    try {
      const formattedPhone = this.formatPhoneForWhatsApp(phone);

      const payload = {
        messaging_product: "whatsapp",
        to: formattedPhone,
        type: "template",
        template: {
          name: this.templateName,
          language: {
            code: "en_US",
          },
          components: [
            {
              type: "body",
              parameters: [
                {
                  type: "text",
                  text: otp,
                },
              ],
            },
            {
              type: "button",
              sub_type: "url",
              index: 0,
              parameters: [
                {
                  type: "text",
                  text: otp,
                },
              ],
            },
          ],
        },
      };

      const headers = {
        "Content-Type": "application/json",
      };

      if (this.apiKey) {
        headers["Authorization"] = `Bearer ${this.apiKey}`;
      }

      const response = await this.retryRequest(async () => {
        const axiosInstance = this.createAxiosInstance();
        return await axiosInstance.post(this.customEndpoint, payload, {
          headers,
        });
      });

      if (response.status >= 400) {
        throw new Error(
          `HTTP ${response.status}: ${JSON.stringify(response.data)}`
        );
      }

      return {
        success: true,
        message: "OTP sent successfully via WhatsApp",
        provider: "facebook-graph-api",
        response: response.data,
      };
    } catch (error) {
      return this.handleAPIError(error, "Failed to send OTP via Facebook Graph API");
    }
  }

  // Send welcome message via custom API (Facebook Graph API)
  async sendWelcomeViaCustomAPI(phone, message) {
    try {
      const formattedPhone = this.formatPhoneForWhatsApp(phone);

      const payload = {
        messaging_product: "whatsapp",
        to: formattedPhone,
        type: "text",
        text: {
          body: message,
        },
      };

      const headers = {
        "Content-Type": "application/json",
      };

      if (this.apiKey) {
        headers["Authorization"] = `Bearer ${this.apiKey}`;
      }

      const response = await this.retryRequest(async () => {
        const axiosInstance = this.createAxiosInstance();
        return await axiosInstance.post(this.customEndpoint, payload, {
          headers,
        });
      });

      if (response.status >= 400) {
        throw new Error(
          `HTTP ${response.status}: ${JSON.stringify(response.data)}`
        );
      }

      return {
        success: true,
        message: "Welcome message sent successfully via WhatsApp",
        provider: "facebook-graph-api",
        response: response.data,
      };
    } catch (error) {
      return this.handleAPIError(
        error,
        "Failed to send welcome message via Facebook Graph API"
      );
    }
  }

  // Handle API errors and return structured error response
  handleAPIError(error, defaultMessage) {
    console.error(
      "Facebook Graph API error:",
      error.response?.data || error.message
    );

    let errorMessage = defaultMessage;
    let errorDetails = {};

    if (error.response?.data?.error) {
      errorMessage = error.response.data.error.message || errorMessage;
      errorDetails = error.response.data.error;
    } else if (error.code === "ECONNABORTED") {
      errorMessage = "Request timeout - Facebook Graph API is not responding";
      errorDetails = { code: "TIMEOUT", timeout: this.timeout };
    } else if (error.code === "ENOTFOUND") {
      errorMessage = "Network error - Cannot reach Facebook Graph API";
      errorDetails = { code: "NETWORK_ERROR", endpoint: this.customEndpoint };
    } else if (error.code === "ECONNREFUSED") {
      errorMessage =
        "Connection refused - Facebook Graph API is not accessible";
      errorDetails = { code: "CONNECTION_REFUSED" };
    }

    return {
      success: false,
      message: errorMessage,
      error: errorDetails,
      debug: {
        endpoint: this.customEndpoint,
        timeout: this.timeout,
        retryAttempts: this.retryAttempts,
      },
    };
  }

  // Format phone number for WhatsApp (Facebook Graph API)
  // Removes + prefix as required by Facebook Graph API
  formatPhoneForWhatsApp(phone) {
    // Remove any non-digit characters except +
    let formatted = phone.replace(/[^\d+]/g, "");

    // Ensure phone starts with + for proper international format
    if (!formatted.startsWith("+")) {
      throw new Error(
        "Phone number must include country code (e.g., +1234567890)"
      );
    }

    // Validate the international format
    const phoneRegex = /^\+[1-9]\d{6,14}$/;
    if (!phoneRegex.test(formatted)) {
      throw new Error(
        "Invalid phone number format. Use international format: +[country code][number]"
      );
    }

    // Remove the + for Facebook Graph API (WhatsApp requires format without +)
    return formatted.replace("+", "");
  }

  // Send message via console (for development)
  async sendViaConsole(phone, message) {
    console.log("\n📱 WhatsApp Message (Console Mode)");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`📞 To: ${phone}`);
    console.log(`📝 Message: ${message}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    return {
      success: true,
      message: "OTP sent successfully (console mode)",
      provider: "console",
    };
  }

  // Format OTP message
  formatOTPMessage(otp) {
    return `🔐 Your Stoory verification code is: *${otp}*

⏰ This code expires in 10 minutes.

🔒 For security, never share this code with anyone.

📱 If you didn't request this code, please ignore this message.`;
  }

  // Format welcome message
  formatWelcomeMessage(userName) {
    return `🎉 Welcome to Stoory, ${userName}!

✅ Your account has been successfully created.

🚀 You can now:
• Browse campaigns and bids
• Connect with brand owners
• Start earning through influencer marketing

📱 Stay tuned for exciting opportunities!

Best regards,
The Stoory Team`;
  }

  // Validate phone number format
  validatePhoneNumber(phone) {
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  }

  // Get service status
  getServiceStatus() {
    return {
      service: this.service,
      configured: this.service === "custom" ? !!this.customEndpoint : true,
      provider:
        this.service === "custom" ? "facebook-graph-api" : this.service,
      endpoint: this.service === "custom" ? this.customEndpoint : null,
    };
  }
}

module.exports = new WhatsAppService();
