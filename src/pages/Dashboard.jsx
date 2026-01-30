import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { isSubscriptionActive, contactAPI, subscriptionAPI, paymentAPI } from '../services/api';
import './Dashboard.css';

// Image Gallery Component
const ImageGallery = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [images] = useState(() => {
    // Generate array of image paths from 1.png to 13.png
    return Array.from({ length: 13 }, (_, i) => `/PDF/${i + 1}.png`);
  });

  const goToSlide = (index) => {
    setCurrentIndex(index);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  return (
    <div className="gallery-container">
      <div className="gallery-main">
        <button className="gallery-nav-button prev" onClick={goToPrevious} aria-label="Previous">
          ‹
        </button>
        <div className="gallery-slide-wrapper">
          <div 
            className="gallery-slides" 
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {images.map((image, index) => (
              <div key={index} className="gallery-slide">
                <img 
                  src={image} 
                  alt={`Tutorial ${index + 1}`}
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
        <button className="gallery-nav-button next" onClick={goToNext} aria-label="Next">
          ›
        </button>
      </div>
      <div className="gallery-indicator">
        <span>{currentIndex + 1} / {images.length}</span>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user, subscription, refreshSubscription, isAuthenticated } = useAuth();
  const [faqOpen, setFaqOpen] = useState(null);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [contactError, setContactError] = useState('');
  const [price, setPrice] = useState(null);
  const [subscribeLoading, setSubscribeLoading] = useState(false);
  const [subscribeError, setSubscribeError] = useState('');

  useEffect(() => {
    refreshSubscription();
  }, []);

  useEffect(() => {
    subscriptionAPI.getPrice().then((data) => setPrice(data)).catch(() => setPrice({ price: 299, currency: 'INR' }));
  }, []);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve();
      document.body.appendChild(script);
    });
  };

  const getPaymentErrorMessage = (err, fallback) => {
    const detail = err.response?.data?.detail;
    if (typeof detail === 'string' && detail.trim()) return detail;
    if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;
    if (err.message && err.message !== 'Network Error') return err.message;
    return fallback;
  };

  // Payment flow per API_DOCUMENTATION.md & PAYMENT_SYSTEM_README.md:
  // 1. GET /subscriptions/price → 2. POST /payments/create-order (amount in rupees) →
  // 3. Razorpay checkout (key_id, order_id, amount in paise) →
  // 4. POST /payments/verify (razorpay_order_id, razorpay_payment_id, razorpay_signature) →
  // 5. Backend activates subscription (1 month)
  const handleSubscribe = async () => {
    setSubscribeError('');
    if (!isAuthenticated) {
      setSubscribeError('Please log in to purchase a subscription.');
      return;
    }
    setSubscribeLoading(true);
    try {
      const priceData = await subscriptionAPI.getPrice();
      const amountInRupees = Number(priceData.price);
      if (!Number.isFinite(amountInRupees) || amountInRupees <= 0) {
        setSubscribeError('Invalid subscription price. Please try again.');
        return;
      }
      const orderData = await paymentAPI.createOrder(amountInRupees, 'INR');
      await loadRazorpayScript();
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.order_id,
        name: 'Jarvis4Everyone',
        description: 'Monthly subscription — Jarvis AI Source Code',
        handler: async (response) => {
          try {
            await paymentAPI.verify(
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature
            );
            await refreshSubscription();
            setSubscribeError('');
          } catch (err) {
            setSubscribeError(getPaymentErrorMessage(err, 'Payment verification failed. Please contact support.'));
          }
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
      };
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () => {
        setSubscribeError('Payment failed or was cancelled.');
      });
      rzp.open();
    } catch (err) {
      setSubscribeError(getPaymentErrorMessage(err, 'Unable to start payment. Please try again.'));
    } finally {
      setSubscribeLoading(false);
    }
  };

  const getFaqs = () => [
    {
      question: 'What do I get with the subscription?',
      answer: 'As a subscriber, you will receive the latest version of the Jarvis AI source code that Shreshth Kaushik is developing in his ongoing YouTube tutorial series. You get access to all the source code updates as the project evolves, ensuring you always have the most current version of the Jarvis AI.'
    },
    {
      question: 'How much does the subscription cost?',
      answer: 'Check the pricing section on this page for current rates and plans.'
    },
    {
      question: 'Can I cancel my subscription?',
      answer: 'No, subscriptions cannot be cancelled by users. Once you subscribe, the subscription will continue until it is managed by administrators. Please ensure you are committed before subscribing.'
    },
    {
      question: 'Can I get a refund if I am not satisfied?',
      answer: 'No, refunds are not available for subscriptions. We recommend reviewing all the subscription details and features before subscribing to ensure it meets your requirements.'
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
                Gain exclusive access to the latest source code from our comprehensive tutorial series. 
                Receive continuous updates synchronized with each new release, ensuring you always have 
                the most current implementation. Every download package includes complete documentation, 
                detailed setup guides, tutorial videos, README files with technical explanations, 
                and dedicated remote support for seamless deployment.
              </p>
              
              <div className="hero-divider"></div>
              
              <div className="hero-buttons">
                <a href="https://kaushikshresth.graphy.com/" target="_blank" rel="noopener noreferrer" className="hero-button">
                  <svg className="button-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                  </svg>
                  <span>MAIN WEBSITE</span>
                </a>
                <a href="https://www.youtube.com/@theshreshthkaushik" target="_blank" rel="noopener noreferrer" className="hero-button">
                  <svg className="button-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                  <span>YOUTUBE</span>
                </a>
                <a href="https://www.instagram.com/theshreshthkaushik/" target="_blank" rel="noopener noreferrer" className="hero-button">
                  <svg className="button-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                  </svg>
                  <span>INSTAGRAM</span>
                </a>
                <a href="https://t.me/theshreshthkaushik" target="_blank" rel="noopener noreferrer" className="hero-button">
                  <svg className="button-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                  <span>TELEGRAM</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section - button placeholder for later */}
      <section className="subscription-section">
        <div className="section-container">
          <div className="section-box">
            <h2 className="section-title">Choose Your Plan</h2>
            <p className="subscription-intro">
              Unlock continuous access to the latest source code updates from our tutorial series.
              Get instant downloads of updated code, comprehensive tutorial videos, detailed setup guides,
              and complete documentation. Stay ahead with every release.
            </p>
            <div className="subscription-card">
              <div className="plan-header">
                <h3>Jarvis AI Source Code</h3>
                <p className="plan-description">Latest source code from YouTube tutorial series + all updates — Monthly subscription</p>
                {price != null && (
                  <p className="plan-price">
                    ₹{Number(price.price).toLocaleString('en-IN')} <span className="plan-price-period">/ month</span>
                  </p>
                )}
              </div>
              <div className="plan-features-grid">
                <div className="feature-item">
                  <span className="feature-icon">✓</span>
                  <span>Latest Source Code — Download the most recent code from our YouTube tutorial series</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">✓</span>
                  <span>Always Updated — Source code updated with every new tutorial video release</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">✓</span>
                  <span>Tutorial Videos — Step-by-step video guides showing setup and implementation</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">✓</span>
                  <span>README Files — Comprehensive documentation for easy setup</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">✓</span>
                  <span>Explanation Documents — Detailed guides explaining how everything works</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">✓</span>
                  <span>Remote Support — Get help when you face any issues during setup</span>
                </div>
              </div>
              {(!subscription || !isSubscriptionActive(subscription)) ? (
                <>
                  {subscribeError && (
                    <div className="subscribe-error-message">{subscribeError}</div>
                  )}
                  <button
                    type="button"
                    className="subscribe-button"
                    onClick={handleSubscribe}
                    disabled={subscribeLoading}
                  >
                    {subscribeLoading
                      ? 'Opening payment...'
                      : price != null
                        ? `Buy the subscription — ₹${Number(price.price).toLocaleString('en-IN')}`
                        : 'Buy the subscription'}
                  </button>
                </>
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
            </div>
          </div>
        </div>
      </section>

      {/* Image Gallery Section */}
      <section className="gallery-section">
        <div className="section-container">
          <div className="section-box">
            <h2 className="section-title">The Most Advanced AI Assistant Tutorials</h2>
            <p className="gallery-description">
              The Most Advanced AI Assistant Tutorial Series on the Entire Internet. Creating J.A.R.V.I.S - An Advanced, Multi-Language AI Assistant Built from Absolute Scratch Using the Most Powerful Modern Technologies.
            </p>
            <div className="gallery-content">
              <ImageGallery />
              <div className="gallery-buttons">
                <a 
                  href="https://www.youtube.com/watch?v=CqSsGvg0Mls&list=PLkjZS1KzvTGH0OLXe-4nfvFtz42rTWaUI&pp=gAQB0gcJCbYEOCosWNinsAgC" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="gallery-button"
                >
                  <svg className="button-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                  <span>Watch Tutorial Playlist</span>
                </a>
                <a 
                  href="https://www.youtube.com/channel/UC7A5u12yVIZaCO_uXnNhc5g" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="gallery-button"
                >
                  <svg className="button-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                    <line x1="8" y1="21" x2="16" y2="21"></line>
                    <line x1="12" y1="17" x2="12" y2="21"></line>
                  </svg>
                  <span>Visit YouTube Channel</span>
                </a>
              </div>
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
                <a href="https://kaushikshresth.graphy.com/" target="_blank" rel="noopener noreferrer" className="social-link">
                  <svg className="button-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                  </svg>
                  <span>MAIN WEBSITE</span>
                </a>
                <a href="https://www.youtube.com/@theshreshthkaushik" target="_blank" rel="noopener noreferrer" className="social-link">
                  <svg className="button-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                  <span>YOUTUBE</span>
                </a>
                <a href="https://www.instagram.com/theshreshthkaushik/" target="_blank" rel="noopener noreferrer" className="social-link">
                  <svg className="button-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                  </svg>
                  <span>INSTAGRAM</span>
                </a>
                <a href="https://t.me/theshreshthkaushik" target="_blank" rel="noopener noreferrer" className="social-link">
                  <svg className="button-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                  <span>TELEGRAM</span>
                </a>
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
            {faqs.map((faq, index) => (
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
                    {contactLoading ? (
                      <>
                        <svg className="button-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <svg className="button-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="22" y1="2" x2="11" y2="13"></line>
                          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                        <span>Send Message</span>
                      </>
                    )}
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
                <li>
                  <a href="/dashboard">
                    <svg className="button-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7"></rect>
                      <rect x="14" y="3" width="7" height="7"></rect>
                      <rect x="14" y="14" width="7" height="7"></rect>
                      <rect x="3" y="14" width="7" height="7"></rect>
                    </svg>
                    <span>Dashboard</span>
                  </a>
                </li>
                <li>
                  <a href="/profile">
                    <svg className="button-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    <span>Profile</span>
                  </a>
                </li>
                <li>
                  <a href="/downloads">
                    <svg className="button-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    <span>Downloads</span>
                  </a>
                </li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Connect</h4>
              <div className="footer-social">
                <a href="https://kaushikshresth.graphy.com/" target="_blank" rel="noopener noreferrer">
                  <svg className="button-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                  </svg>
                  <span>Main Website</span>
                </a>
                <a href="https://www.youtube.com/@theshreshthkaushik" target="_blank" rel="noopener noreferrer">
                  <svg className="button-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                  <span>YouTube</span>
                </a>
                <a href="https://www.instagram.com/theshreshthkaushik/" target="_blank" rel="noopener noreferrer">
                  <svg className="button-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                  </svg>
                  <span>Instagram</span>
                </a>
                <a href="https://t.me/theshreshthkaushik" target="_blank" rel="noopener noreferrer">
                  <svg className="button-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                  <span>Telegram</span>
                </a>
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
              <a href="https://www.youtube.com/watch?v=CqSsGvg0Mls&list=PLkjZS1KzvTGH0OLXe-4nfvFtz42rTWaUI&pp=gAQBsAgC" target="_blank" rel="noopener noreferrer" className="footer-link-button">
                <svg className="button-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                <span>SEE TUTORIALS</span>
              </a>
              <a href="https://www.instagram.com/theshreshthkaushik/" target="_blank" rel="noopener noreferrer" className="footer-link-button">
                <svg className="button-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
                <span>INSTAGRAM</span>
              </a>
              <a href="https://www.instagram.com/jarvis4everyone/" target="_blank" rel="noopener noreferrer" className="footer-link-button">
                <svg className="button-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
                <span>J4E INSTAGRAM</span>
              </a>
              <a href="https://t.me/theshreshthkaushik" target="_blank" rel="noopener noreferrer" className="footer-link-button">
                <svg className="button-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
                <span>TELEGRAM</span>
              </a>
              <a href="https://kaushikshresth.graphy.com/" target="_blank" rel="noopener noreferrer" className="footer-link-button">
                <svg className="button-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="2" y1="12" x2="22" y2="12"></line>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                </svg>
                <span>MAIN WEBSITE</span>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
