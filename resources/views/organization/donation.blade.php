<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Donation - Kalinga</title>
  
  @vite([
    'resources/css/app.css',
    'resources/js/app.js',
    'resources/js/auth-guard.js',
    'resources/js/organization-logout.js'
  ])
  
  <style>
    /* General Reset */
    body {
      font-family: 'Poppins', Arial, sans-serif;
      margin: 0;
      background: #f5f7fa;
      color: #333;
      transition: margin-left 0.3s ease-in-out;
    }

    /* Topbar */
    .topbar {
      background: linear-gradient(90deg, #28a745, #00c853);
      color: #fff;
      padding: 1rem 2rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      transition: margin-left 0.3s ease-in-out;
    }

    .topbar h1 {
      font-weight: 700;
      font-size: 1.8rem;
      letter-spacing: 1px;
    }

    .logout-btn {
      background: #fff;
      color: #28a745;
      font-weight: 600;
      padding: 8px 16px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      box-shadow: 0 3px 6px rgba(0,0,0,0.1);
      transition: all 0.2s ease-in-out;
    }

    .logout-btn:hover {
      background: #f1f1f1;
      transform: translateY(-2px);
    }

    /* Sub Header */
    .sub-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem 2rem;
      transition: margin-left 0.3s ease-in-out;
    }

    .hamburger {
      font-size: 24px;
      cursor: pointer;
      background: #28a745;
      color: #fff;
      padding: 8px 12px;
      border-radius: 8px;
      transition: all 0.2s ease-in-out;
    }

    .hamburger:hover {
      background: #00c853;
    }

    /* Sidebar */
    .sidebar {
      width: 240px;
      background: #fff;
      border-right: 1px solid #ddd;
      height: 100vh;
      position: fixed;
      left: -240px;
      top: 0;
      padding: 2rem 1rem;
      transition: left 0.3s ease-in-out;
      z-index: 1000;
      box-shadow: 2px 0 8px rgba(0,0,0,0.05);
    }

    .sidebar.active {
      left: 0;
    }

    .sidebar a {
      display: block;
      color: #333;
      text-decoration: none;
      padding: 12px 16px;
      margin: 10px 0;
      border-radius: 12px;
      font-weight: 500;
      transition: all 0.2s ease-in-out;
    }

    .sidebar a:hover {
      background: #28a745;
      color: #fff;
      transform: translateX(4px);
    }

    /* Shift Effect */
    .shift {
      margin-left: 240px;
    }

    /* Main Content */
    .main-content {
      padding: 2rem;
      transition: margin-left 0.3s ease-in-out;
      max-width: 1200px;
      margin: 0 auto;
    }

    /* Stats Cards */
    .stats {
      display: flex;
      flex-wrap: wrap;
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .card {
      flex: 1;
      min-width: 220px;
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 6px 18px rgba(0,0,0,0.08);
      padding: 1.5rem;
      text-align: center;
      font-weight: bold;
      position: relative;
      overflow: hidden;
      transition: transform 0.2s ease-in-out;
    }

    .card:hover {
      transform: translateY(-5px);
    }

    .card::before {
      content: '';
      position: absolute;
      top: -40%;
      right: -40%;
      width: 200%;
      height: 200%;
      background: rgba(40, 167, 69, 0.05);
      transform: rotate(45deg);
      pointer-events: none;
    }

    .card h2 {
      font-size: 2rem;
      margin: 0.5rem 0 0;
      color: #28a745;
    }

    .card p {
      margin: 0.5rem 0 0;
      color: #666;
      font-size: 0.9rem;
      font-weight: 500;
    }

    /* Donation Form */
    .donation-section {
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 6px 18px rgba(0,0,0,0.08);
      padding: 2rem;
      margin-bottom: 2rem;
    }

    .donation-section h3 {
      margin-bottom: 1.5rem;
      font-size: 1.6rem;
      color: #28a745;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .donation-form {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 600;
      color: #555;
    }

    .form-group input,
    .form-group select,
    .form-group textarea {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e1e5e9;
      border-radius: 8px;
      font-size: 1rem;
      transition: border-color 0.2s ease-in-out;
      box-sizing: border-box;
    }

    .form-group input:focus,
    .form-group select:focus,
    .form-group textarea:focus {
      outline: none;
      border-color: #28a745;
      box-shadow: 0 0 0 3px rgba(40, 167, 69, 0.1);
    }

    .amount-options {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .amount-btn {
      padding: 12px 16px;
      border: 2px solid #e1e5e9;
      border-radius: 8px;
      background: #fff;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s ease-in-out;
      text-align: center;
    }

    .amount-btn:hover,
    .amount-btn.active {
      border-color: #28a745;
      background: #28a745;
      color: #fff;
    }

    .custom-amount {
      grid-column: 1 / -1;
    }

    .custom-amount input {
      text-align: center;
      font-size: 1.2rem;
      font-weight: 600;
    }

    .payment-methods {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .payment-method {
      padding: 1rem;
      border: 2px solid #e1e5e9;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease-in-out;
      text-align: center;
    }

    .payment-method:hover,
    .payment-method.active {
      border-color: #28a745;
      background: rgba(40, 167, 69, 0.05);
    }

    .payment-method img {
      width: 40px;
      height: 25px;
      object-fit: contain;
      margin-bottom: 0.5rem;
    }

    .donate-btn {
      background: linear-gradient(90deg, #28a745, #00c853);
      color: #fff;
      border: none;
      padding: 16px 32px;
      border-radius: 12px;
      font-size: 1.1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease-in-out;
      box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
      width: 100%;
    }

    .donate-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(40, 167, 69, 0.4);
    }

    .donate-btn:disabled {
      background: #ccc;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    /* Recent Donations */
    .recent-donations {
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 6px 18px rgba(0,0,0,0.08);
      padding: 2rem;
    }

    .recent-donations h3 {
      margin-bottom: 1.5rem;
      font-size: 1.6rem;
      color: #28a745;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .donation-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      border-bottom: 1px solid #f0f0f0;
      transition: background 0.2s ease-in-out;
    }

    .donation-item:hover {
      background: #f8f9fa;
    }

    .donation-item:last-child {
      border-bottom: none;
    }

    .donor-info {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .donor-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #28a745;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
    }

    .donor-details h4 {
      margin: 0;
      font-size: 1rem;
      color: #333;
    }

    .donor-details p {
      margin: 0;
      font-size: 0.85rem;
      color: #666;
    }

    .donation-amount {
      font-size: 1.2rem;
      font-weight: 600;
      color: #28a745;
    }

    /* Mock Badge */
    .mock-badge {
      background: #ffc107;
      color: #000;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-weight: bold;
      font-size: 0.9rem;
      display: inline-block;
      margin-bottom: 1rem;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .donation-form {
        grid-template-columns: 1fr;
        gap: 1rem;
      }
      
      .stats {
        flex-direction: column;
      }
      
      .main-content {
        padding: 1rem;
      }
      
      .donation-section, .recent-donations {
        padding: 1.5rem;
      }
    }
  </style>
</head>
<body>
  <!-- Topbar -->
  <div class="topbar" id="topbar">
    <h1>Kalinga</h1>
    <button id="logoutBtn" class="logout-btn">Logout</button>
  </div>

  <!-- Sub Header -->
  <div class="sub-header" id="subHeader">
    <span class="hamburger" id="hamburger"><i class="bi bi-list"></i></span>
    <h2><i class="bi bi-heart"></i> Donation Center</h2>
  </div>

  <!-- Sidebar -->
  <div class="sidebar" id="sidebar">
    <a href="/organization/dashboard">Dashboard</a>
    <a href="/missions/history">History of Missions</a>
    <a href="/organization/volunteers">Volunteers</a>
    <a href="/donation" style="background:#28a745;color:#fff;">Donation</a>
    <a href="/organization/profile">Profiles</a>
  </div>

  <!-- Main Content -->
  <div class="main-content" id="mainContent">
    <!-- Stats Cards -->
    <div class="stats">
      <div class="card">
        <h2 id="totalDonations">₱12,450</h2>
        <p>Total Raised</p>
      </div>
      <div class="card">
        <h2 id="thisMonth">₱3,200</h2>
        <p>This Month</p>
      </div>
      <div class="card">
        <h2 id="donorsCount">47</h2>
        <p>Donors</p>
      </div>
    </div>

    <!-- Donation Form -->
    <div class="donation-section">
      <h3><i class="bi bi-heart"></i> Make a Donation</h3>
      <div class="mock-badge">MOCK-UP VERSION</div>
      
      <form id="donationForm" class="donation-form">
        <div class="form-column">
          <div class="form-group">
            <label>Donation Amount</label>
            <div class="amount-options">
              <button type="button" class="amount-btn" data-amount="100">₱100</button>
              <button type="button" class="amount-btn" data-amount="500">₱500</button>
              <button type="button" class="amount-btn" data-amount="1000">₱1,000</button>
              <button type="button" class="amount-btn" data-amount="2000">₱2,000</button>
              <button type="button" class="amount-btn" data-amount="5000">₱5,000</button>
              <div class="custom-amount">
                <input type="number" id="customAmount" placeholder="Enter custom amount" min="1">
              </div>
            </div>
          </div>

          <div class="form-group">
            <label>Donor Information</label>
            <input type="text" id="donorName" placeholder="Your name" required>
          </div>

          <div class="form-group">
            <label>Email Address</label>
            <input type="email" id="donorEmail" placeholder="your@email.com" required>
          </div>

          <div class="form-group">
            <label>Phone Number</label>
            <input type="tel" id="donorPhone" placeholder="+63 912 345 6789">
          </div>
        </div>

        <div class="form-column">
          <div class="form-group">
            <label>Payment Method</label>
            <div class="payment-methods">
              <div class="payment-method active" data-method="gcash">
                <div><i class="bi bi-phone"></i></div>
                <div>GCash</div>
              </div>
              <div class="payment-method" data-method="paymaya">
                <div><i class="bi bi-credit-card"></i></div>
                <div>PayMaya</div>
              </div>
              <div class="payment-method" data-method="bank">
                <div><i class="bi bi-bank"></i></div>
                <div>Bank Transfer</div>
              </div>
              <div class="payment-method" data-method="cash">
                <div><i class="bi bi-cash-stack"></i></div>
                <div>Cash</div>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label>Message (Optional)</label>
            <textarea id="donorMessage" rows="4" placeholder="Leave a message of support..."></textarea>
          </div>

          <div class="form-group">
            <label>
              <input type="checkbox" id="anonymousDonation" style="width: auto; margin-right: 8px;">
              Make this donation anonymous
            </label>
          </div>

          <button type="submit" class="donate-btn" id="donateBtn">
            <i class="bi bi-heart"></i> Donate Now
          </button>
        </div>
      </form>
    </div>

    <!-- Recent Donations -->
    <div class="recent-donations">
      <h3><i class="bi bi-hand-thumbs-up"></i> Recent Donations</h3>
      
      <div class="donation-item">
        <div class="donor-info">
          <div class="donor-avatar">M</div>
          <div class="donor-details">
            <h4>Maria Santos</h4>
            <p>2 hours ago</p>
          </div>
        </div>
        <div class="donation-amount">₱1,500</div>
      </div>

      <div class="donation-item">
        <div class="donor-info">
          <div class="donor-avatar">J</div>
          <div class="donor-details">
            <h4>Juan Dela Cruz</h4>
            <p>5 hours ago</p>
          </div>
        </div>
        <div class="donation-amount">₱2,000</div>
      </div>

      <div class="donation-item">
        <div class="donor-info">
          <div class="donor-avatar">A</div>
          <div class="donor-details">
            <h4>Anonymous</h4>
            <p>1 day ago</p>
          </div>
        </div>
        <div class="donation-amount">₱500</div>
      </div>

      <div class="donation-item">
        <div class="donor-info">
          <div class="donor-avatar">R</div>
          <div class="donor-details">
            <h4>Roberto Garcia</h4>
            <p>2 days ago</p>
          </div>
        </div>
        <div class="donation-amount">₱3,000</div>
      </div>
    </div>
  </div>

  <script>
    const sidebar = document.getElementById("sidebar");
    const hamburger = document.getElementById("hamburger");
    const topbar = document.getElementById("topbar");
    const subHeader = document.getElementById("subHeader");
    const mainContent = document.getElementById("mainContent");

    hamburger.addEventListener("click", () => {
      sidebar.classList.toggle("active");
      topbar.classList.toggle("shift");
      subHeader.classList.toggle("shift");
      mainContent.classList.toggle("shift");
    });

    // Donation Form Functionality
    let selectedAmount = 0;
    let selectedPaymentMethod = 'gcash';

    // Amount selection
    document.querySelectorAll('.amount-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedAmount = parseInt(btn.dataset.amount);
        document.getElementById('customAmount').value = '';
      });
    });

    // Custom amount
    document.getElementById('customAmount').addEventListener('input', (e) => {
      document.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('active'));
      selectedAmount = parseInt(e.target.value) || 0;
    });

    // Payment method selection
    document.querySelectorAll('.payment-method').forEach(method => {
      method.addEventListener('click', () => {
        document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('active'));
        method.classList.add('active');
        selectedPaymentMethod = method.dataset.method;
      });
    });

    // Form submission
    document.getElementById('donationForm').addEventListener('submit', (e) => {
      e.preventDefault();
      
      const donorName = document.getElementById('donorName').value;
      const donorEmail = document.getElementById('donorEmail').value;
      const donorPhone = document.getElementById('donorPhone').value;
      const donorMessage = document.getElementById('donorMessage').value;
      const isAnonymous = document.getElementById('anonymousDonation').checked;
      
      if (!selectedAmount || selectedAmount <= 0) {
        alert('Please select a donation amount');
        return;
      }

      // Mock donation processing
      const donateBtn = document.getElementById('donateBtn');
      donateBtn.disabled = true;
      donateBtn.textContent = 'Processing...';

      setTimeout(() => {
        alert(`[SUCCESS] Thank you for your donation of ₱${selectedAmount.toLocaleString()}!\n\nThis is a mock-up version. In a real implementation, this would process the payment through ${selectedPaymentMethod.toUpperCase()}.`);
        
        donateBtn.disabled = false;
        donateBtn.innerHTML = '<i class="bi bi-heart"></i> Donate Now';
        
        // Reset form
        document.getElementById('donationForm').reset();
        document.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('active'));
        document.querySelector('.payment-method[data-method="gcash"]').classList.add('active');
        selectedAmount = 0;
        selectedPaymentMethod = 'gcash';
      }, 2000);
    });
  </script>
</body>
</html>
