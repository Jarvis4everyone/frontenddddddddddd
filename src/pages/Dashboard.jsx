import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { paymentAPI, isSubscriptionActive, contactAPI } from '../services/api';
import SubscriptionService from '../services/subscriptionService';
import './Dashboard.css';

const Dashboard = () => {
  const { user, subscription, refreshSubscription } = useAuth();
  const [error, setError] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [faqOpen, setFaqOpen] = useState(null);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [contactError, setContactError] = useState('');
  const [price, setPrice] = useState(null);
  const [priceLoading, setPriceLoading] = useState(true);

  useEffect(() => {
    refreshSubscription();
    // Fetch subscription price
    async function fetchPrice() {
      try {
        const priceData = await SubscriptionService.getPrice();
        setPrice(priceData.price);
      } catch (error) {
        console.error('Error fetching price:', error);
        // Fallback to default price
        setPrice(299);
      } finally {
        setPriceLoading(false);
      }
    }
    fetchPrice();
  }, []);

  const handlePayment = async () => {
    if (!price) {
      alert('Price not available. Please refresh the page.');
      return;
    }

    setPaymentLoading(true);
    setError('');
    
    try {
      // Get fresh price data (in case it changed)
      const priceData = await SubscriptionService.getPrice();
      const amountToPay = priceData.price;
      
      const orderData = await paymentAPI.createOrder(amountToPay, 'INR');
      
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.order_id,
        name: 'Jarvis4Everyone',
        description: 'Monthly Subscription',
        handler: async function (response) {
          try {
            await paymentAPI.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            
            await refreshSubscription();
            alert('Payment successful! Your subscription has been activated.');
          } catch (verifyError) {
            setError(verifyError.response?.data?.detail || 'Payment verification failed');
            alert('Payment verification failed. Please contact support.');
          }
        },
        prefill: {},
        theme: {
          color: '#667eea',
        },
        modal: {
          ondismiss: function() {
            setPaymentLoading(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        setError(response.error.description || 'Payment failed');
        setPaymentLoading(false);
        alert('Payment failed. Please try again.');
      });
      
      rzp.open();
      setPaymentLoading(false);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create payment order');
      setPaymentLoading(false);
    }
  };

  const getFaqs = () => [
    {
      question: 'What do I get with the subscription?',
      answer: 'As a subscriber, you will receive the latest version of the Jarvis AI source code that Shreshth Kaushik is developing in his ongoing YouTube tutorial series. You get access to all the source code updates as the project evolves, ensuring you always have the most current version of the Jarvis AI.'
    },
    {
      question: 'How much does the subscription cost?',
      answer: price 
        ? `The subscription is priced at ₹${price.toFixed(2)} per month. This gives you complete access to the latest Jarvis AI source code and all updates throughout your subscription period.`
        : 'The subscription price is set by the backend. Please check the pricing section for current rates.'
    },
    {
      question: 'What payment methods are accepted?',
      answer: 'We accept all major payment methods through Razorpay including credit cards, debit cards, UPI, net banking, and wallets.'
    },
    {
      question: 'Can I cancel my subscription?',
      answer: 'No, subscriptions cannot be cancelled by users. Once you subscribe, the subscription will continue until it is managed by administrators. Please ensure you are committed to the subscription before making the payment.'
    },
    {
      question: 'Can I get a refund if I am not satisfied?',
      answer: 'No, refunds are not available for subscriptions. All payments are final. We recommend reviewing all the subscription details and features before subscribing to ensure it meets your requirements.'
    },
    {
      question: 'How will I receive the source code updates?',
      answer: 'You will receive the latest source code versions as Shreshth Kaushik creates them in his ongoing YouTube tutorial series. The source code will be available for download through your account, and you will have access to all updates released during your active subscription period.'
    }
  ];

  const faqs = getFaqs();

  const toggleFaq = (index) => {
    setFaqOpen(faqOpen === index ? null : index);
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setContactLoading(true);
    setContactError('');
    setContactSuccess(false);

    const formData = new FormData(e.target);
    const contactData = {
      name: formData.get('name'),
      email: formData.get('email'),
      subject: formData.get('subject') || 'General Inquiry',
      message: formData.get('message'),
    };

    try {
      await contactAPI.sendMessage(contactData);
      setContactSuccess(true);
      e.target.reset();
      setTimeout(() => {
        setContactSuccess(false);
      }, 5000);
    } catch (err) {
      setContactError(err.response?.data?.detail || 'Failed to send message. Please try again.');
    } finally {
      setContactLoading(false);
    }
  };

  return (
    <div className="dashboard-landing">
      {/* Header Section - Full Width */}
      <section className="hero-section">
        <div className="section-container">
          <div className="hero-box">
            <div className="hero-content">
              <div className="hero-gif">
                <img src="/jarvis.gif" alt="Jarvis" />
              </div>
              <h1 className="hero-title">Jarvis4Everyone</h1>
              <p className="hero-description">
                Get access to the latest source code of Jarvis, ongoing tutorial series on YouTube, 
                and comprehensive documentation with setup and deployment guides. Join thousands of 
                developers learning AI automation, build powerful assistants, and transform your 
                workflow with cutting-edge technology and expert guidance.
              </p>
              
              <div className="hero-divider"></div>
              
              <div className="hero-buttons">
                <a href="https://kaushikshresth.graphy.com/" target="_blank" rel="noopener noreferrer" className="hero-button">
                  UNACADEMY
                </a>
                <a href="https://www.youtube.com/@theshreshthkaushik" target="_blank" rel="noopener noreferrer" className="hero-button">
                  YOUTUBE
                </a>
                <a href="https://www.instagram.com/theshreshthkaushik/" target="_blank" rel="noopener noreferrer" className="hero-button">
                  INSTAGRAM
                </a>
                <a href="https://t.me/theshreshthkaushik" target="_blank" rel="noopener noreferrer" className="hero-button">
                  TELEGRAM
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Payment Subscription Section */}
      <section className="subscription-section">
        <div className="section-container">
          <div className="section-box">
            <h2 className="section-title">Choose Your Plan</h2>
            <p className="subscription-intro">
              {price 
                ? `Subscribe to the complete Jarvis AI source code for just ₹${price.toFixed(2)}/month. Unlimited customization and instant access to every new update while you stay subscribed. Start building your personal AI assistant today!`
                : 'Subscribe to the complete Jarvis AI source code. Unlimited customization and instant access to every new update while you stay subscribed. Start building your personal AI assistant today!'
              }
            </p>
            <div className="subscription-card">
              <div className="plan-header">
                <h3>Jarvis AI Source Code</h3>
                <div className="plan-price">
                  {priceLoading ? (
                    <span className="price-amount">Loading...</span>
                  ) : (
                    <>
                      <span className="price-amount">₹{price?.toFixed(2) || '299.00'}</span>
                      <span className="price-period">/month</span>
                    </>
                  )}
                </div>
                <p className="plan-description">Complete source code access + all future updates - Monthly subscription</p>
              </div>
              <div className="plan-features-grid">
                <div className="feature-item">
                  <span className="feature-icon">✓</span>
                  <span>Complete Source Code — Full access to all Jarvis AI codebase</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">✓</span>
                  <span>Every Update Included — New features & source code drops released instantly to subscribers</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">✓</span>
                  <span>Voice & Video Interaction — Talk naturally and see your AI respond face-to-face</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">✓</span>
                  <span>Unlimited Usage — No limits, use it as much as you want</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">✓</span>
                  <span>Image Generation — Bring your ideas to life visually</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">✓</span>
                  <span>All Operating Systems Supported — Windows, macOS, Android, iOS</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">✓</span>
                  <span>Multiple Voices & Languages — Choose any voice, male or female, in any language</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">✓</span>
                  <span>Priority Support — Get help when you need it</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">✓</span>
                  <span>Open/close apps and websites</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">✓</span>
                  <span>Search instantly on Google & YouTube</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">✓</span>
                  <span>Play music</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">✓</span>
                  <span>Write code & content for you</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">✓</span>
                  <span>Generate images</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">✓</span>
                  <span>Hold smart, human-like conversations</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">✓</span>
                  <span>Fully personalized: rename your AI anytime</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">✓</span>
                  <span>Remembers you and your preferences</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">✓</span>
                  <span>Full internet access</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">✓</span>
                  <span>Self-learning & always improving</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">✓</span>
                  <span>Super fast & easy to set up</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">✓</span>
                  <span>Next-Level Insight Tool — Search for public information</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">✓</span>
                  <span>Most Advanced Self-Learning — Continuously evolves</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">✓</span>
                  <span>Maximum Productivity — Designed for power users</span>
                </div>
              </div>
              {(!subscription || !isSubscriptionActive(subscription)) ? (
                <button 
                  onClick={handlePayment} 
                  className="subscribe-button"
                  disabled={paymentLoading || !price || priceLoading}
                >
                  {paymentLoading 
                    ? 'Processing...' 
                    : price 
                      ? `Buy now for only ₹${price.toFixed(2)}/month`
                      : 'Loading price...'
                  }
                </button>
              ) : (
                <div className="subscription-active">
                  <div className="subscription-status-content">
                    <div className="subscription-checkmark">✓</div>
                    <p className="subscription-status-text">Your subscription is active</p>
                    <p className="subscription-date">
                      Valid until: {new Date(subscription.end_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
              {error && <div className="error-message">{error}</div>}
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="about-section">
        <div className="section-container">
          <div className="section-box">
            <h2 className="section-title">About Shreshth Kaushik</h2>
            <div className="about-content">
            <div className="about-image">
              <img src="/image.jpg" alt="Shreshth Kaushik" />
            </div>
            <div className="about-text">
              <p className="about-name">SHRESHTH KAUSHIK</p>
              <p className="about-description">
                Shreshth Kaushik is an online educator, businessman, and programmer known for 
                simplifying complex topics with innovative teaching methods. He offers basic to 
                advanced courses, all built from scratch to help learners grow step by step.
              </p>
              <p className="about-description">
                His unique approach makes learning easy, practical, and enjoyable for everyone. 
                Kaushik's goal is to help people turn knowledge into real-world skills and confidence.
              </p>
              <div className="social-links">
                <a href="https://kaushikshresth.graphy.com/" target="_blank" rel="noopener noreferrer" className="social-link">UNACADEMY</a>
                <a href="https://www.youtube.com/@theshreshthkaushik" target="_blank" rel="noopener noreferrer" className="social-link">YOUTUBE</a>
                <a href="https://www.instagram.com/theshreshthkaushik/" target="_blank" rel="noopener noreferrer" className="social-link">INSTAGRAM</a>
                <a href="https://t.me/theshreshthkaushik" target="_blank" rel="noopener noreferrer" className="social-link">TELEGRAM</a>
              </div>
            </div>
          </div>
          </div>
        </div>
      </section>

      {/* Video Section */}
      <section className="video-section">
        <div className="section-container">
          <div className="section-box">
            <h2 className="section-title">Watch Our Latest Video</h2>
            <p className="video-description">Watch our latest video and create your Jarvis now.</p>
            <div className="video-container">
              <iframe
                width="100%"
                height="500"
                src="https://www.youtube.com/embed/E4fGvJ2nGkY"
                title="Jarvis Tutorial"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="video-iframe"
              ></iframe>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="faq-section">
        <div className="section-container">
          <div className="section-box">
            <h2 className="section-title">Frequently Asked Questions</h2>
            <div className="faq-list">
            {getFaqs().map((faq, index) => (
              <div key={index} className="faq-item">
                <button 
                  className="faq-question" 
                  onClick={() => toggleFaq(index)}
                >
                  <span>{faq.question}</span>
                  <span className="faq-icon">{faqOpen === index ? '−' : '+'}</span>
                </button>
                {faqOpen === index && (
                  <div className="faq-answer">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact Us Section */}
      <section className="contact-section">
        <div className="section-container">
          <div className="section-box">
            <h2 className="section-title">Contact Us</h2>
            <div className="contact-content">
              <div className="contact-image">
                <img src="/CONTACT.jpg" alt="Contact Us" />
              </div>
              <div className="contact-form">
                <h3>Send us a Message</h3>
                <form className="form" onSubmit={handleContactSubmit}>
                  <div className="form-group">
                    <label htmlFor="name">Name *</label>
                    <input 
                      type="text" 
                      id="name" 
                      name="name" 
                      defaultValue={user?.name || ''}
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="email">Email *</label>
                    <input 
                      type="email" 
                      id="email" 
                      name="email" 
                      defaultValue={user?.email || ''}
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="subject">Subject</label>
                    <input 
                      type="text" 
                      id="subject" 
                      name="subject" 
                      placeholder="General Inquiry"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="message">Message *</label>
                    <textarea 
                      id="message" 
                      name="message" 
                      rows="5" 
                      required
                    ></textarea>
                  </div>
                  {contactSuccess && (
                    <div className="contact-success-message">
                      Thank you for your message! We will get back to you soon.
                    </div>
                  )}
                  {contactError && (
                    <div className="contact-error-message">
                      {contactError}
                    </div>
                  )}
                  <button 
                    type="submit" 
                    className="submit-button"
                    disabled={contactLoading}
                  >
                    {contactLoading ? 'Sending...' : 'Send Message'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="dashboard-footer">
        <div className="footer-container">
          <div className="footer-content">
            <div className="footer-section">
              <h3>Jarvis4Everyone</h3>
              <p>Get access to the latest Jarvis source code, tutorials, and comprehensive documentation.</p>
            </div>
            <div className="footer-section">
              <h4>Quick Links</h4>
              <ul>
                <li><a href="/dashboard">Dashboard</a></li>
                <li><a href="/profile">Profile</a></li>
                <li><a href="/downloads">Downloads</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Connect</h4>
              <div className="footer-social">
                <a href="https://kaushikshresth.graphy.com/" target="_blank" rel="noopener noreferrer">Unacademy</a>
                <a href="https://www.youtube.com/@theshreshthkaushik" target="_blank" rel="noopener noreferrer">YouTube</a>
                <a href="https://www.instagram.com/theshreshthkaushik/" target="_blank" rel="noopener noreferrer">Instagram</a>
                <a href="https://t.me/theshreshthkaushik" target="_blank" rel="noopener noreferrer">Telegram</a>
              </div>
            </div>
            <div className="footer-section">
              <h4>Support</h4>
              <ul>
                <li><a href="#faq">FAQ</a></li>
                <li><a href="#contact">Contact Us</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2026 The Shreshth Kaushik. All rights reserved.</p>
            <div className="footer-links">
              <a href="#privacy">Privacy Policy</a>
              <a href="#terms">Terms of Use</a>
              <a href="#refund">Refund Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
