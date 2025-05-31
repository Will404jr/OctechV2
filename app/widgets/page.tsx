"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Hospital, Users, Download } from "lucide-react"

export default function HospitalFloatingWidgets() {
  // Hospital Staff Login Widget - Direct conversion from serving-login-page.tsx
  const loginWidgetScript = `
// Hospital Staff Login Floating Widget
(function() {
  if(document.getElementById('hospital-login-widget')) {
    console.log('Hospital login widget already active!');
    return;
  }
  
  // Create floating login button
  const loginButton = document.createElement('div');
  loginButton.id = 'hospital-login-button';
  loginButton.style.cssText = \`
    position: fixed;
    top: 80px;
    right: 20px;
    width: 60px;
    height: 60px;
    background: linear-gradient(135deg, #0e4480 0%, #1e40af 100%);
    border-radius: 50%;
    cursor: pointer;
    z-index: 999998;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(14, 68, 128, 0.3);
    transition: all 0.3s ease;
    border: 3px solid white;
    font-family: system-ui, -apple-system, sans-serif;
  \`;
  
  const loginIcon = document.createElement('span');
  loginIcon.textContent = '🏥';
  loginIcon.style.cssText = 'color: white; font-size: 24px;';
  loginButton.appendChild(loginIcon);
  
  // Create login modal
  const loginModal = document.createElement('div');
  loginModal.id = 'hospital-login-modal';
  loginModal.style.cssText = \`
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.7);
    z-index: 1000001;
    display: none;
    align-items: center;
    justify-content: center;
    font-family: system-ui, -apple-system, sans-serif;
  \`;
  
  // Create login form - exact replica of your component
  const loginForm = document.createElement('div');
  loginForm.style.cssText = \`
    background: white;
    padding: 32px;
    border-radius: 16px;
    width: 90%;
    max-width: 400px;
    box-shadow: 0 20px 40px rgba(0,0,0,0.3);
    position: relative;
  \`;
  
  loginForm.innerHTML = \`
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="font-size: 48px; margin-bottom: 16px;">🏥</div>
      <h2 style="margin: 0; color: #0e4480; font-size: 24px;">Staff Login</h2>
      <p style="margin: 8px 0 0 0; color: #64748b;">Enter your credentials to access the serving system</p>
    </div>
    
    <div id="login-loading" style="display: none; text-align: center; padding: 20px;">
      <div style="font-size: 32px; margin-bottom: 16px;">⏳</div>
      <p>Logging in...</p>
    </div>
    
    <div id="login-form-fields">
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #374151;">Email</label>
        <input id="staff-email" type="email" placeholder="m@example.com" style="
          width: 100%;
          padding: 12px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          box-sizing: border-box;
        ">
      </div>
      
      <div style="margin-bottom: 24px;">
        <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #374151;">Password</label>
        <input id="staff-password" type="password" style="
          width: 100%;
          padding: 12px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          box-sizing: border-box;
        ">
      </div>
      
      <button id="submit-login" style="
        width: 100%;
        padding: 12px 24px;
        border: none;
        background: #0e4480;
        color: white;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
      ">Login</button>
    </div>
    
    <!-- Room Selection Section (initially hidden) -->
    <div id="room-selection" style="display: none;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="font-size: 48px; margin-bottom: 16px;">🏢</div>
        <h2 style="margin: 0; color: #0e4480; font-size: 24px;">Room Selection</h2>
        <p style="margin: 8px 0 0 0; color: #64748b;">Select your department and room for today</p>
      </div>
      
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #374151;">Department</label>
        <select id="staff-department" style="
          width: 100%;
          padding: 12px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          box-sizing: border-box;
        ">
          <option value="">Loading departments...</option>
        </select>
      </div>
      
      <div style="margin-bottom: 24px;">
        <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #374151;">Room Number</label>
        <input id="room-number" type="text" placeholder="Enter room number" style="
          width: 100%;
          padding: 12px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          box-sizing: border-box;
        ">
        <p id="existing-rooms" style="font-size: 12px; color: #6b7280; margin-top: 4px;"></p>
      </div>
      
      <button id="assign-room" style="
        width: 100%;
        padding: 12px 24px;
        border: none;
        background: #0e4480;
        color: white;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
      ">Assign Room & Continue</button>
    </div>
    
    <div id="login-error" style="display: none; margin-top: 16px; padding: 12px; background: #fee2e2; border: 1px solid #fca5a5; border-radius: 8px; color: #dc2626; font-size: 14px;"></div>
    
    <button id="close-login" style="
      position: absolute;
      top: 16px;
      right: 16px;
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #6b7280;
    ">×</button>
  \`;
  
  loginModal.appendChild(loginForm);
  
  // Create main widget container
  const widget = document.createElement('div');
  widget.id = 'hospital-login-widget';
  widget.appendChild(loginButton);
  widget.appendChild(loginModal);
  
  document.body.appendChild(widget);
  
  // State variables
  let isLoggedIn = false;
  let staffInfo = null;
  let departments = [];
  let existingRooms = [];
  
  // API functions - using your exact endpoints
  async function checkSession() {
    try {
      const response = await fetch('/api/session');
      const session = await response.json();
      if (session.isLoggedIn) {
        isLoggedIn = true;
        staffInfo = {
          _id: session.userId,
          firstName: session.firstName || '',
          lastName: session.lastName || '',
          email: session.email || ''
        };
        await checkActiveRoom(session.userId);
      }
    } catch (error) {
      console.error('Error checking session:', error);
    }
  }
  
  async function checkActiveRoom(userId) {
    try {
      const roomResponse = await fetch(\`/api/hospital/staff/\${userId}/active-room\`);
      if (roomResponse.ok) {
        const roomData = await roomResponse.json();
        if (roomData.hasActiveRoom && roomData.department) {
          // Update session with department info
          await fetch('/api/session/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              department: roomData.department.title,
              roomId: roomData.room?._id
            })
          });
          
          // Activate appropriate widget
          if (roomData.department.title === 'Reception') {
            activateReceptionistWidget();
          } else {
            activateServingWidget();
          }
          loginModal.style.display = 'none';
        }
      }
    } catch (error) {
      console.error('Error checking active room:', error);
    }
  }
  
  async function login(email, password) {
    const loadingDiv = document.getElementById('login-loading');
    const formFields = document.getElementById('login-form-fields');
    const errorDiv = document.getElementById('login-error');
    
    loadingDiv.style.display = 'block';
    formFields.style.display = 'none';
    errorDiv.style.display = 'none';
    
    try {
      const response = await fetch('/api/hospital/serving-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      if (response.ok) {
        const result = await response.json();
        isLoggedIn = true;
        
        // Log successful login
        await fetch('/api/hospital/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            staffId: result.userId,
            action: 'Login',
            details: 'Login successful'
          })
        });
        
        staffInfo = {
          _id: result.userId,
          firstName: result.firstName || '',
          lastName: result.lastName || '',
          email: email
        };
        
        await checkActiveRoom(result.userId);
        
        // If no active room, show room selection
        if (!document.getElementById('receptionist-widget') && !document.getElementById('serving-widget')) {
          showRoomSelection();
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }
    } catch (error) {
      errorDiv.textContent = error.message;
      errorDiv.style.display = 'block';
      formFields.style.display = 'block';
      loadingDiv.style.display = 'none';
    }
  }
  
  async function showRoomSelection() {
    document.getElementById('login-form-fields').style.display = 'none';
    document.getElementById('room-selection').style.display = 'block';
    document.getElementById('login-loading').style.display = 'none';
    
    // Load departments
    try {
      const response = await fetch('/api/hospital/department');
      if (response.ok) {
        departments = await response.json();
        const select = document.getElementById('staff-department');
        select.innerHTML = '<option value="">Select department</option>';
        departments.forEach(dept => {
          const option = document.createElement('option');
          option.value = dept._id;
          option.textContent = \`\${dept.icon} \${dept.title}\`;
          select.appendChild(option);
        });
      }
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  }
  
  async function loadExistingRooms(departmentId) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(\`/api/hospital/department/\${departmentId}/rooms?date=\${today}\`);
      if (response.ok) {
        const data = await response.json();
        existingRooms = data.rooms.map(room => room.roomNumber);
        document.getElementById('existing-rooms').textContent = 
          existingRooms.length > 0 ? \`Existing rooms today: \${existingRooms.join(', ')}\` : '';
      }
    } catch (error) {
      console.error('Error loading existing rooms:', error);
    }
  }
  
  async function assignRoom(departmentId, roomNumber) {
    if (existingRooms.includes(roomNumber)) {
      document.getElementById('login-error').textContent = 'This room number is already in use today. Please choose another.';
      document.getElementById('login-error').style.display = 'block';
      return;
    }
    
    try {
      const response = await fetch('/api/hospital/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: staffInfo._id,
          department: departmentId,
          roomNumber,
          available: false,
          date: new Date().toISOString().split('T')[0]
        })
      });
      
      if (response.ok) {
        const roomData = await response.json();
        
        // Get department title
        const deptResponse = await fetch(\`/api/hospital/department/\${departmentId}\`);
        const deptData = await deptResponse.json();
        
        // Update session
        await fetch('/api/session/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            department: deptData.title,
            roomId: roomData.roomId
          })
        });
        
        // Log room assignment
        await fetch('/api/hospital/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            staffId: staffInfo._id,
            action: 'Room selection',
            details: \`Room \${roomNumber} assigned in \${deptData.title} department\`
          })
        });
        
        loginModal.style.display = 'none';
        
        // Activate appropriate widget
        if (deptData.title === 'Reception') {
          activateReceptionistWidget();
        } else {
          activateServingWidget();
        }
      }
    } catch (error) {
      console.error('Error assigning room:', error);
      document.getElementById('login-error').textContent = 'Failed to assign room';
      document.getElementById('login-error').style.display = 'block';
    }
  }
  
  // Event handlers
  loginButton.addEventListener('mouseenter', () => {
    loginButton.style.transform = 'scale(1.1)';
  });
  
  loginButton.addEventListener('mouseleave', () => {
    loginButton.style.transform = 'scale(1)';
  });
  
  loginButton.addEventListener('click', () => {
    loginModal.style.display = 'flex';
    checkSession();
  });
  
  document.getElementById('close-login').addEventListener('click', () => {
    loginModal.style.display = 'none';
  });
  
  document.getElementById('submit-login').addEventListener('click', () => {
    const email = document.getElementById('staff-email').value;
    const password = document.getElementById('staff-password').value;
    if (email && password) {
      login(email, password);
    }
  });
  
  document.getElementById('staff-department').addEventListener('change', (e) => {
    if (e.target.value) {
      loadExistingRooms(e.target.value);
    }
  });
  
  document.getElementById('assign-room').addEventListener('click', () => {
    const departmentId = document.getElementById('staff-department').value;
    const roomNumber = document.getElementById('room-number').value;
    if (departmentId && roomNumber) {
      assignRoom(departmentId, roomNumber);
    }
  });
  
  // Handle Enter key
  ['staff-email', 'staff-password', 'room-number'].forEach(id => {
    document.getElementById(id).addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        if (id === 'room-number') {
          document.getElementById('assign-room').click();
        } else {
          document.getElementById('submit-login').click();
        }
      }
    });
  });
  
  console.log('🏥 Hospital Login widget activated!');
})();`

  // Receptionist Widget - Direct conversion from receptionist-page.tsx
  const receptionistWidgetScript = `
// Hospital Receptionist Dashboard Widget
function activateReceptionistWidget() {
  if(document.getElementById('receptionist-widget')) {
    console.log('Receptionist widget already active!');
    return;
  }
  
  // Create floating receptionist button
  const receptionistButton = document.createElement('div');
  receptionistButton.id = 'receptionist-button';
  receptionistButton.style.cssText = \`
    position: fixed;
    top: 150px;
    right: 20px;
    width: 60px;
    height: 60px;
    background: linear-gradient(135deg, #059669 0%, #047857 100%);
    border-radius: 50%;
    cursor: pointer;
    z-index: 999997;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
    transition: all 0.3s ease;
    border: 3px solid white;
    font-family: system-ui, -apple-system, sans-serif;
  \`;
  
  const receptionistIcon = document.createElement('span');
  receptionistIcon.textContent = '👥';
  receptionistIcon.style.cssText = 'color: white; font-size: 24px;';
  receptionistButton.appendChild(receptionistIcon);
  
  // Create receptionist dashboard modal - exact replica of your component
  const receptionistModal = document.createElement('div');
  receptionistModal.id = 'receptionist-modal';
  receptionistModal.style.cssText = \`
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.7);
    z-index: 1000002;
    display: none;
    align-items: center;
    justify-content: center;
    font-family: system-ui, -apple-system, sans-serif;
  \`;
  
  // Create dashboard content
  const dashboardContent = document.createElement('div');
  dashboardContent.style.cssText = \`
    background: white;
    padding: 24px;
    border-radius: 16px;
    width: 95%;
    max-width: 1200px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 40px rgba(0,0,0,0.3);
  \`;
  
  dashboardContent.innerHTML = \`
    <!-- Header Section -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 2px solid #e5e7eb; padding-bottom: 16px;">
      <div>
        <h1 style="margin: 0; color: #0e4480; font-size: 28px;">Receptionist Dashboard</h1>
        <p style="margin: 8px 0 0 0; color: #64748b;" id="room-info">Managing Reception...</p>
      </div>
      <div style="display: flex; gap: 12px; align-items: center;">
        <div style="display: flex; align-items: center; gap: 8px; background: #0e4480; color: white; padding: 8px 16px; border-radius: 20px;">
          <span>👥</span>
          <span id="waiting-count">0 waiting</span>
        </div>
        <button id="refresh-tickets" style="padding: 8px 16px; border: 1px solid #d1d5db; background: white; border-radius: 8px; cursor: pointer;">Refresh</button>
        <button id="close-receptionist" style="padding: 8px 16px; border: 1px solid #d1d5db; background: white; border-radius: 8px; cursor: pointer;">✕ Close</button>
      </div>
    </div>
    
    <!-- Main Content -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
      <!-- Current Ticket Section -->
      <div style="background: white; border: none; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-radius: 12px; overflow: hidden;">
        <div style="background: #0e4480; color: white; padding: 16px;">
          <h2 style="margin: 0; font-size: 20px; display: flex; align-items: center; gap: 8px;">
            ⏰ Current Ticket
          </h2>
          <p style="margin: 8px 0 0 0; opacity: 0.9;" id="current-ticket-desc">No active ticket</p>
        </div>
        <div style="padding: 24px;" id="current-ticket-content">
          <div style="background: #dbeafe; border: 1px solid #93c5fd; border-radius: 8px; padding: 16px; text-align: center; color: #1e40af;">
            <div style="margin-bottom: 8px;">⚠️</div>
            <div>Click "Start Serving" to begin serving tickets</div>
          </div>
        </div>
        <div style="background: #f8fafc; padding: 16px; display: none;" id="current-ticket-actions">
          <!-- Action buttons will be added here -->
        </div>
      </div>
      
      <!-- Held Tickets Section -->
      <div style="background: white; border: none; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-radius: 12px; overflow: hidden;">
        <div style="background: #059669; color: white; padding: 16px;">
          <h2 style="margin: 0; font-size: 20px; display: flex; align-items: center; gap: 8px;">
            ⏸️ Held Tickets
          </h2>
          <p style="margin: 8px 0 0 0; opacity: 0.9;" id="held-tickets-desc">0 tickets on hold</p>
        </div>
        <div style="padding: 24px; max-height: 600px; overflow-y: auto;" id="held-tickets-content">
          <div style="text-align: center; color: #64748b; padding: 40px;">
            <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;">⏸️</div>
            <p>No tickets are currently on hold</p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Control Panel -->
    <div style="margin-top: 24px; text-align: center;">
      <button id="control-panel-btn" style="
        padding: 12px 24px;
        background: #0e4480;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 16px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0 auto;
      ">
        👥 Control Panel
      </button>
    </div>
  \`;
  
  receptionistModal.appendChild(dashboardContent);
  
  // Create main widget container
  const widget = document.createElement('div');
  widget.id = 'receptionist-widget';
  widget.appendChild(receptionistButton);
  widget.appendChild(receptionistModal);
  
  document.body.appendChild(widget);
  
  // State variables - matching your component
  let tickets = [];
  let heldTickets = [];
  let departments = [];
  let currentTicket = null;
  let userType = '';
  let reasonForVisit = '';
  let patientName = '';
  let receptionistNote = '';
  let session = null;
  let roomId = null;
  let isServing = false;
  let roomNumber = '';
  
  // Initialize
  async function initialize() {
    await fetchSession();
    await fetchDepartments();
    await fetchTickets();
    updateUI();
  }
  
  async function fetchSession() {
    try {
      const response = await fetch('/api/session');
      if (response.ok) {
        session = await response.json();
        if (session.roomId) {
          roomId = session.roomId;
          await fetchRoomDetails();
        }
      }
    } catch (error) {
      console.error('Error fetching session:', error);
    }
  }
  
  async function fetchRoomDetails() {
    if (roomId) {
      try {
        const response = await fetch(\`/api/hospital/room/\${roomId}\`);
        if (response.ok) {
          const room = await response.json();
          roomNumber = room.roomNumber;
          isServing = room.available;
          
          document.getElementById('room-info').textContent = \`Managing Reception in Room \${roomNumber}\`;
          
          if (room.available && room.currentTicket) {
            const ticketResponse = await fetch(\`/api/hospital/ticket/\${room.currentTicket}\`);
            if (ticketResponse.ok) {
              currentTicket = await ticketResponse.json();
              updateCurrentTicketUI();
            }
          }
        }
      } catch (error) {
        console.error('Error fetching room details:', error);
      }
    }
  }
  
  async function fetchDepartments() {
    try {
      const response = await fetch('/api/hospital/department');
      if (response.ok) {
        departments = await response.json();
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  }
  
  async function fetchTickets() {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch unassigned tickets
      const response = await fetch(\`/api/hospital/ticket?unassigned=true&date=\${today}\`);
      if (response.ok) {
        const data = await response.json();
        tickets = data.filter(ticket => !ticket.held);
        if (currentTicket) {
          tickets = tickets.filter(ticket => ticket._id !== currentTicket._id);
        }
      }
      
      // Fetch held tickets
      const heldResponse = await fetch(\`/api/hospital/ticket?unassigned=true&held=true&date=\${today}\`);
      if (heldResponse.ok) {
        heldTickets = await heldResponse.json();
      }
      
      updateUI();
    } catch (error) {
      console.error('Error fetching tickets:', error);
    }
  }
  
  function updateUI() {
    document.getElementById('waiting-count').textContent = \`\${tickets.length} waiting\`;
    document.getElementById('held-tickets-desc').textContent = \`\${heldTickets.length} ticket\${heldTickets.length !== 1 ? 's' : ''} on hold\`;
    updateHeldTicketsUI();
  }
  
  function updateCurrentTicketUI() {
    const content = document.getElementById('current-ticket-content');
    const actions = document.getElementById('current-ticket-actions');
    const desc = document.getElementById('current-ticket-desc');
    
    if (currentTicket) {
      desc.textContent = \`Serving ticket \${currentTicket.ticketNo}\`;
      
      content.innerHTML = \`
        <div style="margin-bottom: 24px;">
          <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
            <div style="background: #0e4480; color: white; padding: 8px 16px; border-radius: 8px; font-size: 18px; font-weight: bold;">
              \${currentTicket.ticketNo}
            </div>
            \${currentTicket.emergency ? '<div style="background: #fee2e2; color: #dc2626; padding: 4px 8px; border-radius: 4px; font-size: 12px; animation: pulse 2s infinite;">🚨 EMERGENCY</div>' : ''}
            \${currentTicket.call ? '<div style="background: #d1fae5; color: #047857; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Called</div>' : ''}
            \${currentTicket.userType ? \`<div style="background: #dbeafe; color: #1d4ed8; padding: 4px 8px; border-radius: 4px; font-size: 12px;">\${currentTicket.userType}</div>\` : ''}
          </div>
          
          <div style="display: flex; gap: 16px; margin-bottom: 16px;">
            <button id="emergency-toggle" style="
              padding: 8px 16px;
              border: 2px solid \${currentTicket.emergency ? '#dc2626' : '#fca5a5'};
              background: \${currentTicket.emergency ? '#dc2626' : 'white'};
              color: \${currentTicket.emergency ? 'white' : '#dc2626'};
              border-radius: 6px;
              cursor: pointer;
              font-size: 12px;
            ">\${currentTicket.emergency ? '🚨 Remove Emergency' : '🚨 Mark Emergency'}</button>
            
            <button id="call-ticket" style="
              padding: 8px 16px;
              border: 2px solid #0e4480;
              background: white;
              color: #0e4480;
              border-radius: 6px;
              cursor: pointer;
              font-size: 12px;
              \${currentTicket.call ? 'opacity: 0.5; cursor: not-allowed;' : ''}
            " \${currentTicket.call ? 'disabled' : ''}>📢 Call Ticket</button>
          </div>
        </div>
        
        \${currentTicket.departmentHistory && currentTicket.departmentHistory.length > 1 ? \`
          <div style="background: #dbeafe; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
            <h3 style="margin: 0 0 12px 0; color: #1d4ed8;">Ticket Journey</h3>
            \${currentTicket.departmentHistory.map(history => \`
              <div style="background: white; padding: 12px; border-radius: 6px; margin-bottom: 8px; border-left: 4px solid \${history.completed ? '#10b981' : '#3b82f6'};">
                <div style="display: flex; justify-content: between; align-items: center;">
                  <span style="font-weight: 500;">\${history.icon || ''} \${history.department}</span>
                  <span style="font-size: 12px; color: #6b7280;">\${new Date(history.timestamp).toLocaleString()}</span>
                </div>
                \${history.note ? \`<p style="margin: 8px 0 0 0; font-size: 14px; color: #374151;">\${history.note}</p>\` : ''}
              </div>
            \`).join('')}
          </div>
        \` : \`
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
            <div>
              <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #374151;">User Type</label>
              <select id="user-type" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px;">
                <option value="">Select user type</option>
                <option value="Cash">Cash</option>
                <option value="Insurance">Insurance</option>
                <option value="Staff">Staff</option>
              </select>
            </div>
            <div>
              <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #374151;">Reason for Visit</label>
              <select id="reason-visit" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px;">
                <option value="">Select reason</option>
                <option value="General Inquiry">General Inquiry</option>
                <option value="Appointment">Appointment</option>
                <option value="Emergency">Emergency</option>
                <option value="Follow-up">Follow-up</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #374151;">Patient Name</label>
            <input id="patient-name" type="text" placeholder="Enter patient name" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px;">
          </div>
        \`}
        
        <div>
          <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #374151;">Receptionist Note</label>
          <textarea id="receptionist-note" placeholder="Add any additional notes..." style="width: 100%; height: 80px; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px; resize: vertical;"></textarea>
        </div>
      \`;
      
      actions.style.display = 'flex';
      actions.innerHTML = \`
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button id="hold-ticket" style="padding: 8px 16px; border: 2px solid #f59e0b; background: #fef3c7; color: #92400e; border-radius: 6px; cursor: pointer; font-size: 14px;">⏸️ Hold</button>
          <button id="cancel-ticket" style="padding: 8px 16px; border: 2px solid #ef4444; background: #fee2e2; color: #dc2626; border-radius: 6px; cursor: pointer; font-size: 14px;">❌ Cancel</button>
          <button id="next-step" style="padding: 8px 16px; border: none; background: #0e4480; color: white; border-radius: 6px; cursor: pointer; font-size: 14px;">👥 Next Step</button>
          <button id="clear-ticket" style="padding: 8px 16px; border: none; background: #059669; color: white; border-radius: 6px; cursor: pointer; font-size: 14px;">✅ Clear</button>
        </div>
      \`;
      
      // Add event listeners for current ticket actions
      addCurrentTicketEventListeners();
    } else {
      desc.textContent = 'No active ticket';
      content.innerHTML = \`
        <div style="background: #dbeafe; border: 1px solid #93c5fd; border-radius: 8px; padding: 16px; text-align: center; color: #1e40af;">
          <div style="margin-bottom: 8px;">⚠️</div>
          <div>\${isServing ? 'No ticket currently being served. Click "Next Ticket" to get the next ticket in queue.' : 'Click "Start Serving" to begin serving tickets'}</div>
        </div>
      \`;
      actions.style.display = 'none';
    }
  }
  
  function updateHeldTicketsUI() {
    const content = document.getElementById('held-tickets-content');
    
    if (heldTickets.length > 0) {
      content.innerHTML = heldTickets.map(ticket => \`
        <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; border-radius: 8px; margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <h3 style="margin: 0; color: #0e4480; font-size: 16px;">\${ticket.ticketNo}</h3>
            <button onclick="unholdTicket('\${ticket._id}')" style="padding: 4px 8px; border: 1px solid #22c55e; background: white; color: #22c55e; border-radius: 4px; cursor: pointer; font-size: 12px;">▶️ Return</button>
          </div>
          \${ticket.reasonforVisit ? \`<p style="margin: 0 0 8px 0; color: #374151; font-size: 14px;">\${ticket.reasonforVisit}</p>\` : ''}
          \${ticket.receptionistNote ? \`
            <div style="background: white; padding: 8px; border-radius: 4px; border: 1px solid #d1fae5;">
              <p style="margin: 0; font-weight: 500; font-size: 12px; color: #374151;">Notes:</p>
              <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 12px;">\${ticket.receptionistNote}</p>
            </div>
          \` : ''}
        </div>
      \`).join('');
    } else {
      content.innerHTML = \`
        <div style="text-align: center; color: #64748b; padding: 40px;">
          <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;">⏸️</div>
          <p>No tickets are currently on hold</p>
        </div>
      \`;
    }
  }
  
  function addCurrentTicketEventListeners() {
    // Emergency toggle
    const emergencyBtn = document.getElementById('emergency-toggle');
    if (emergencyBtn) {
      emergencyBtn.addEventListener('click', async () => {
        try {
          const response = await fetch(\`/api/hospital/ticket/\${currentTicket._id}\`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              emergency: !currentTicket.emergency,
              currentDepartment: 'Reception'
            })
          });
          
          if (response.ok) {
            currentTicket.emergency = !currentTicket.emergency;
            updateCurrentTicketUI();
          }
        } catch (error) {
          console.error('Error updating emergency status:', error);
        }
      });
    }
    
    // Call ticket
    const callBtn = document.getElementById('call-ticket');
    if (callBtn && !currentTicket.call) {
      callBtn.addEventListener('click', async () => {
        try {
          const response = await fetch(\`/api/hospital/ticket/\${currentTicket._id}\`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ call: true })
          });
          
          if (response.ok) {
            currentTicket.call = true;
            updateCurrentTicketUI();
          }
        } catch (error) {
          console.error('Error calling ticket:', error);
        }
      });
    }
    
    // Hold ticket
    document.getElementById('hold-ticket')?.addEventListener('click', holdTicket);
    document.getElementById('cancel-ticket')?.addEventListener('click', cancelTicket);
    document.getElementById('next-step')?.addEventListener('click', showNextStepDialog);
    document.getElementById('clear-ticket')?.addEventListener('click', clearTicket);
  }
  
  async function startServing() {
    if (!roomId) return;
    
    try {
      const response = await fetch(\`/api/hospital/room/\${roomId}\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ available: true })
      });
      
      if (response.ok) {
        isServing = true;
        await fetchNextTicket();
        updateCurrentTicketUI();
      }
    } catch (error) {
      console.error('Error starting serving:', error);
    }
  }
  
  async function fetchNextTicket() {
    if (currentTicket) return;
    
    try {
      await fetchTickets();
      
      if (tickets.length > 0) {
        const sortedTickets = tickets.sort((a, b) => {
          if (a.emergency && !b.emergency) return -1;
          if (!a.emergency && b.emergency) return 1;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
        
        const nextTicket = sortedTickets[0];
        
        // Assign room to ticket
        await fetch(\`/api/hospital/ticket/\${nextTicket._id}/assign-room\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId: roomId,
            department: 'Reception'
          })
        });
        
        currentTicket = nextTicket;
        
        // Update room serving ticket
        await fetch(\`/api/hospital/room/\${roomId}\`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentTicket: nextTicket._id })
        });
        
        tickets = tickets.filter(ticket => ticket._id !== nextTicket._id);
        updateUI();
        updateCurrentTicketUI();
      }
    } catch (error) {
      console.error('Error fetching next ticket:', error);
    }
  }
  
  async function holdTicket() {
    if (!currentTicket) return;
    
    try {
      const isReturnedTicket = currentTicket.departmentHistory && currentTicket.departmentHistory.length > 1;
      const note = document.getElementById('receptionist-note')?.value || '';
      
      const response = await fetch(\`/api/hospital/ticket/\${currentTicket._id}\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          held: true,
          patientName: isReturnedTicket ? currentTicket.patientName : document.getElementById('patient-name')?.value,
          reasonForVisit: isReturnedTicket ? currentTicket.reasonforVisit : document.getElementById('reason-visit')?.value,
          receptionistNote: note,
          currentDepartment: 'Reception',
          roomId
        })
      });
      
      if (response.ok) {
        currentTicket = null;
        await fetch(\`/api/hospital/room/\${roomId}\`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentTicket: null })
        });
        
        await fetchTickets();
        updateCurrentTicketUI();
      }
    } catch (error) {
      console.error('Error holding ticket:', error);
    }
  }
  
  async function cancelTicket() {
    if (!currentTicket) return;
    
    try {
      const note = document.getElementById('receptionist-note')?.value || '';
      
      const response = await fetch(\`/api/hospital/ticket/\${currentTicket._id}\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noShow: true,
          receptionistNote: note
        })
      });
      
      if (response.ok) {
        currentTicket = null;
        await fetch(\`/api/hospital/room/\${roomId}\`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentTicket: null })
        });
        
        await fetchTickets();
        updateCurrentTicketUI();
      }
    } catch (error) {
      console.error('Error cancelling ticket:', error);
    }
  }
  
  async function clearTicket() {
    if (!currentTicket) return;
    
    const isReturnedTicket = currentTicket.departmentHistory && currentTicket.departmentHistory.length > 1;
    
    if (!isReturnedTicket) {
      const userType = document.getElementById('user-type')?.value;
      const reasonForVisit = document.getElementById('reason-visit')?.value;
      if (!userType || !reasonForVisit) {
        alert('Please select a user type and reason for visit');
        return;
      }
    }
    
    try {
      const note = document.getElementById('receptionist-note')?.value || '';
      
      const response = await fetch(\`/api/hospital/ticket/\${currentTicket._id}/clear\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userType: isReturnedTicket ? currentTicket.userType : document.getElementById('user-type')?.value,
          reasonForVisit: isReturnedTicket ? currentTicket.reasonforVisit : document.getElementById('reason-visit')?.value,
          patientName: isReturnedTicket ? currentTicket.patientName : document.getElementById('patient-name')?.value,
          receptionistNote: note,
          currentDepartment: 'Reception',
          roomId
        })
      });
      
      if (response.ok) {
        currentTicket = null;
        await fetch(\`/api/hospital/room/\${roomId}\`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentTicket: null })
        });
        
        await fetchTickets();
        updateCurrentTicketUI();
      }
    } catch (error) {
      console.error('Error clearing ticket:', error);
    }
  }
  
  function showNextStepDialog() {
    // Create department selection dialog
    const dialog = document.createElement('div');
    dialog.style.cssText = \`
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      z-index: 1000003;
      display: flex;
      align-items: center;
      justify-content: center;
    \`;
    
    dialog.innerHTML = \`
      <div style="background: white; padding: 24px; border-radius: 12px; max-width: 500px; width: 90%;">
        <h3 style="margin: 0 0 16px 0; color: #0e4480;">Select Next Department</h3>
        <div id="department-list" style="max-height: 300px; overflow-y: auto;">
          \${departments.map(dept => \`
            <div style="border: 2px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 12px; cursor: pointer; transition: all 0.2s;" 
                 onclick="selectDepartment('\${dept._id}')" 
                 onmouseover="this.style.borderColor='#0e4480'; this.style.backgroundColor='#f0f9ff';"
                 onmouseout="this.style.borderColor='#e5e7eb'; this.style.backgroundColor='white';">
              <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 24px;">\${dept.icon}</span>
                <span style="font-weight: 500; color: #374151;">\${dept.title}</span>
              </div>
            </div>
          \`).join('')}
        </div>
        <button onclick="this.parentElement.parentElement.remove()" style="
          margin-top: 16px;
          padding: 8px 16px;
          border: 1px solid #d1d5db;
          background: white;
          border-radius: 6px;
          cursor: pointer;
        ">Cancel</button>
      </div>
    \`;
    
    document.body.appendChild(dialog);
    
    window.selectDepartment = async (departmentId) => {
      const isReturnedTicket = currentTicket.departmentHistory && currentTicket.departmentHistory.length > 1;
      
      if (!isReturnedTicket) {
        const userType = document.getElementById('user-type')?.value;
        const reasonForVisit = document.getElementById('reason-visit')?.value;
        if (!userType || !reasonForVisit) {
          alert('Please select a user type and reason for visit');
          return;
        }
      }
      
      try {
        const note = document.getElementById('receptionist-note')?.value || '';
        
        const response = await fetch(\`/api/hospital/ticket/\${currentTicket._id}/next-step\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            departmentId,
            userType: isReturnedTicket ? currentTicket.userType : document.getElementById('user-type')?.value,
            reasonForVisit: isReturnedTicket ? currentTicket.reasonforVisit : document.getElementById('reason-visit')?.value,
            patientName: isReturnedTicket ? currentTicket.patientName : document.getElementById('patient-name')?.value,
            receptionistNote: note,
            currentDepartment: 'Reception'
          })
        });
        
        if (response.ok) {
          currentTicket = null;
          await fetch(\`/api/hospital/room/\${roomId}\`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentTicket: null })
          });
          
          await fetchTickets();
          updateCurrentTicketUI();
          dialog.remove();
        }
      } catch (error) {
        console.error('Error assigning next step:', error);
      }
    };
  }
  
  // Global function for unholding tickets
  window.unholdTicket = async function(ticketId) {
    try {
      const response = await fetch(\`/api/hospital/ticket/\${ticketId}\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          held: false,
          currentDepartment: 'Reception',
          roomId: roomId
        })
      });
      
      if (response.ok) {
        const updatedTicket = await response.json();
        
        if (currentTicket) {
          alert('Please complete the current ticket first');
          return;
        }
        
        // Assign room to ticket
        await fetch(\`/api/hospital/ticket/\${ticketId}/assign-room\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId: roomId,
            department: 'Reception'
          })
        });
        
        currentTicket = updatedTicket;
        
        // Update room serving ticket
        await fetch(\`/api/hospital/room/\${roomId}\`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentTicket: ticketId })
        });
        
        await fetchTickets();
        updateCurrentTicketUI();
      }
    } catch (error) {
      console.error('Error unholding ticket:', error);
    }
  };
  
  // Event handlers
  receptionistButton.addEventListener('mouseenter', () => {
    receptionistButton.style.transform = 'scale(1.1)';
  });
  
  receptionistButton.addEventListener('mouseleave', () => {
    receptionistButton.style.transform = 'scale(1)';
  });
  
  receptionistButton.addEventListener('click', () => {
    receptionistModal.style.display = 'flex';
    initialize();
  });
  
  document.getElementById('close-receptionist').addEventListener('click', () => {
    receptionistModal.style.display = 'none';
  });
  
  document.getElementById('refresh-tickets').addEventListener('click', fetchTickets);
  
  document.getElementById('control-panel-btn').addEventListener('click', () => {
    // Create control panel dialog
    const dialog = document.createElement('div');
    dialog.style.cssText = \`
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      z-index: 1000003;
      display: flex;
      align-items: center;
      justify-content: center;
    \`;
    
    dialog.innerHTML = \`
      <div style="background: white; padding: 24px; border-radius: 12px; max-width: 400px; width: 90%;">
        <h3 style="margin: 0 0 16px 0; color: #0e4480;">Reception Actions</h3>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          \${isServing ? \`
            <button onclick="pauseServing()" style="
              padding: 12px;
              border: 2px solid #ef4444;
              background: #fee2e2;
              color: #dc2626;
              border-radius: 8px;
              cursor: pointer;
              font-weight: 500;
            ">⏸️ Pause Serving</button>
            <button onclick="fetchNextTicket(); this.parentElement.parentElement.parentElement.remove();" style="
              padding: 12px;
              border: none;
              background: #3b82f6;
              color: white;
              border-radius: 8px;
              cursor: pointer;
              font-weight: 500;
            ">➡️ Next Ticket</button>
          \` : \`
            <button onclick="startServing(); this.parentElement.parentElement.parentElement.remove();" style="
              padding: 12px;
              border: none;
              background: #059669;
              color: white;
              border-radius: 8px;
              cursor: pointer;
              font-weight: 500;
            ">▶️ Start Serving</button>
          \`}
        </div>
        <button onclick="this.parentElement.parentElement.remove()" style="
          margin-top: 16px;
          padding: 8px 16px;
          border: 1px solid #d1d5db;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          width: 100%;
        ">Close</button>
      </div>
    \`;
    
    document.body.appendChild(dialog);
    
    window.pauseServing = async () => {
      if (currentTicket) {
        alert('Please complete or hold the current ticket before pausing');
        return;
      }
      
      try {
        await fetch(\`/api/hospital/room/\${roomId}\`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ available: false })
        });
        
        isServing = false;
        updateCurrentTicketUI();
        dialog.remove();
      } catch (error) {
        console.error('Error pausing serving:', error);
      }
    };
    
    window.startServing = startServing;
    window.fetchNextTicket = fetchNextTicket;
  });
  
  // Auto-refresh tickets every 60 seconds
  setInterval(fetchTickets, 60000);
  
  console.log('👥 Receptionist Dashboard widget activated!');
}`

  // Serving Widget - Direct conversion from serving-page.tsx
  const servingWidgetScript = `
// Hospital Serving Dashboard Widget
function activateServingWidget() {
  if(document.getElementById('serving-widget')) {
    console.log('Serving widget already active!');
    return;
  }
  
  // Create floating serving button
  const servingButton = document.createElement('div');
  servingButton.id = 'serving-button';
  servingButton.style.cssText = \`
    position: fixed;
    top: 220px;
    right: 20px;
    width: 60px;
    height: 60px;
    background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);
    border-radius: 50%;
    cursor: pointer;
    z-index: 999996;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
    transition: all 0.3s ease;
    border: 3px solid white;
    font-family: system-ui, -apple-system, sans-serif;
  \`;
  
  const servingIcon = document.createElement('span');
  servingIcon.textContent = '🏥';
  servingIcon.style.cssText = 'color: white; font-size: 24px;';
  servingButton.appendChild(servingIcon);
  
  // Create serving dashboard modal - exact replica of your component
  const servingModal = document.createElement('div');
  servingModal.id = 'serving-modal';
  servingModal.style.cssText = \`
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.7);
    z-index: 1000003;
    display: none;
    align-items: center;
    justify-content: center;
    font-family: system-ui, -apple-system, sans-serif;
  \`;
  
  // Create dashboard content
  const dashboardContent = document.createElement('div');
  dashboardContent.style.cssText = \`
    background: white;
    padding: 24px;
    border-radius: 16px;
    width: 95%;
    max-width: 1200px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 40px rgba(0,0,0,0.3);
  \`;
  
  dashboardContent.innerHTML = \`
    <!-- Header Section -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 2px solid #e5e7eb; padding-bottom: 16px;">
      <div>
        <h1 style="margin: 0; color: #0e4480; font-size: 28px;" id="department-title">Department Dashboard</h1>
        <p style="margin: 8px 0 0 0; color: #64748b;" id="room-info">Managing department...</p>
      </div>
      <div style="display: flex; gap: 12px; align-items: center;">
        <div style="display: flex; align-items: center; gap: 8px; background: #0e4480; color: white; padding: 8px 16px; border-radius: 20px;">
          <span>👥</span>
          <span id="waiting-count">0 waiting</span>
        </div>
        <button id="refresh-tickets" style="padding: 8px 16px; border: 1px solid #d1d5db; background: white; border-radius: 8px; cursor: pointer;">Refresh</button>
        <button id="close-serving" style="padding: 8px 16px; border: 1px solid #d1d5db; background: white; border-radius: 8px; cursor: pointer;">✕ Close</button>
      </div>
    </div>
    
    <!-- Main Content -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
      <!-- Current Ticket Section -->
      <div style="background: white; border: none; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-radius: 12px; overflow: hidden;">
        <div style="background: #0e4480; color: white; padding: 16px;">
          <h2 style="margin: 0; font-size: 20px; display: flex; align-items: center; gap: 8px;">
            ⏰ Current Ticket
          </h2>
          <p style="margin: 8px 0 0 0; opacity: 0.9;" id="current-ticket-desc">No active ticket</p>
        </div>
        <div style="padding: 24px;" id="current-ticket-content">
          <div style="background: #dbeafe; border: 1px solid #93c5fd; border-radius: 8px; padding: 16px; text-align: center; color: #1e40af;">
            <div style="margin-bottom: 8px;">⚠️</div>
            <div>Click "Start Serving" to begin serving tickets</div>
          </div>
        </div>
        <div style="background: #f8fafc; padding: 16px; display: none;" id="current-ticket-actions">
          <!-- Action buttons will be added here -->
        </div>
      </div>
      
      <!-- Held Tickets Section -->
      <div style="background: white; border: none; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-radius: 12px; overflow: hidden;">
        <div style="background: #059669; color: white; padding: 16px;">
          <h2 style="margin: 0; font-size: 20px; display: flex; align-items: center; gap: 8px;">
            ⏸️ Held Tickets
          </h2>
          <p style="margin: 8px 0 0 0; opacity: 0.9;" id="held-tickets-desc">0 tickets on hold</p>
        </div>
        <div style="padding: 24px; max-height: 600px; overflow-y: auto;" id="held-tickets-content">
          <div style="text-align: center; color: #64748b; padding: 40px;">
            <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;">⏸️</div>
            <p>No tickets are currently on hold</p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Control Panel -->
    <div style="margin-top: 24px; text-align: center;">
      <button id="control-panel-btn" style="
        padding: 12px 24px;
        background: #0e4480;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 16px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0 auto;
      ">
        👥 Control Panel
      </button>
    </div>
  \`;
  
  servingModal.appendChild(dashboardContent);
  
  // Create main widget container
  const widget = document.createElement('div');
  widget.id = 'serving-widget';
  widget.appendChild(servingButton);
  widget.appendChild(servingModal);
  
  document.body.appendChild(widget);
  
  // State variables - matching your component
  let tickets = [];
  let heldTickets = [];
  let departments = [];
  let currentTicket = null;
  let departmentNote = '';
  let session = null;
  let roomId = null;
  let isServing = false;
  let roomNumber = '';
  let departmentName = '';
  
  // Initialize
  async function initialize() {
    await fetchSession();
    await fetchDepartments();
    await fetchTickets();
    updateUI();
  }
  
  async function fetchSession() {
    try {
      const response = await fetch('/api/session');
      if (response.ok) {
        session = await response.json();
        if (session.roomId) {
          roomId = session.roomId;
          departmentName = session.department || '';
          await fetchRoomDetails();
        }
      }
    } catch (error) {
      console.error('Error fetching session:', error);
    }
  }
  
  async function fetchRoomDetails() {
    if (roomId) {
      try {
        const response = await fetch(\`/api/hospital/room/\${roomId}\`);
        if (response.ok) {
          const room = await response.json();
          roomNumber = room.roomNumber;
          isServing = room.available;
          
          document.getElementById('department-title').textContent = \`\${departmentName} Dashboard\`;
          document.getElementById('room-info').textContent = \`Managing \${departmentName} in Room \${roomNumber}\`;
          
          if (room.available && room.currentTicket) {
            const ticketResponse = await fetch(\`/api/hospital/ticket/\${room.currentTicket}\`);
            if (ticketResponse.ok) {
              currentTicket = await ticketResponse.json();
              if (currentTicket.departmentNote) {
                departmentNote = currentTicket.departmentNote;
              }
              updateCurrentTicketUI();
            }
          }
        }
      } catch (error) {
        console.error('Error fetching room details:', error);
      }
    }
  }
  
  async function fetchDepartments() {
    try {
      const response = await fetch('/api/hospital/department');
      if (response.ok) {
        departments = await response.json();
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  }
  
  async function fetchTickets() {
    if (!session?.department || !roomId) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch tickets for this department
      const response = await fetch(\`/api/hospital/ticket?date=\${today}&department=\${session.department}&completed=false\`);
      if (response.ok) {
        const data = await response.json();
        
        // Filter tickets for this room
        const filteredTickets = data.filter(ticket => {
          if (ticket.held) return false;
          
          const currentDeptHistory = ticket.departmentHistory?.find(
            history => !history.completed && history.department === session.department
          );
          
          return !currentDeptHistory?.roomId || currentDeptHistory.roomId === roomId;
        });
        
        tickets = currentTicket ? filteredTickets.filter(ticket => ticket._id !== currentTicket._id) : filteredTickets;
      }
      
      // Fetch held tickets
      const heldResponse = await fetch(\`/api/hospital/ticket?held=true&date=\${today}&department=\${session.department}&completed=false\`);
      if (heldResponse.ok) {
        const heldData = await heldResponse.json();
        
        heldTickets = heldData.filter(ticket => {
          const currentDeptHistory = ticket.departmentHistory?.find(
            history => !history.completed && history.department === session.department
          );
          return !currentDeptHistory?.roomId || currentDeptHistory.roomId === roomId;
        });
      }
      
      updateUI();
    } catch (error) {
      console.error('Error fetching tickets:', error);
    }
  }
  
  function updateUI() {
    document.getElementById('waiting-count').textContent = \`\${tickets.length} waiting\`;
    document.getElementById('held-tickets-desc').textContent = \`\${heldTickets.length} ticket\${heldTickets.length !== 1 ? 's' : ''} on hold\`;
    updateHeldTicketsUI();
  }
  
  function updateCurrentTicketUI() {
    const content = document.getElementById('current-ticket-content');
    const actions = document.getElementById('current-ticket-actions');
    const desc = document.getElementById('current-ticket-desc');
    
    if (currentTicket) {
      desc.textContent = \`Serving \${currentTicket.patientName || 'null'}, \${currentTicket.ticketNo}\`;
      
      content.innerHTML = \`
        <div style="margin-bottom: 24px;">
          <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
            <div style="background: #0e4480; color: white; padding: 8px 16px; border-radius: 8px; font-size: 18px; font-weight: bold;">
              \${currentTicket.ticketNo}
            </div>
            \${currentTicket.emergency ? '<div style="background: #fee2e2; color: #dc2626; padding: 4px 8px; border-radius: 4px; font-size: 12px; animation: pulse 2s infinite;">🚨 EMERGENCY</div>' : ''}
            \${currentTicket.call ? '<div style="background: #d1fae5; color: #047857; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Called</div>' : ''}
            \${currentTicket.userType ? \`<div style="background: #dbeafe; color: #1d4ed8; padding: 4px 8px; border-radius: 4px; font-size: 12px;">\${currentTicket.userType}</div>\` : ''}
          </div>
          
          <div style="display: flex; gap: 16px; margin-bottom: 16px;">
            <button id="emergency-toggle" style="
              padding: 8px 16px;
              border: 2px solid \${currentTicket.emergency ? '#dc2626' : '#fca5a5'};
              background: \${currentTicket.emergency ? '#dc2626' : 'white'};
              color: \${currentTicket.emergency ? 'white' : '#dc2626'};
              border-radius: 6px;
              cursor: pointer;
              font-size: 12px;
            ">\${currentTicket.emergency ? '🚨 Remove Emergency' : '🚨 Mark Emergency'}</button>
            
            <button id="call-ticket" style="
              padding: 8px 16px;
              border: 2px solid #0e4480;
              background: white;
              color: #0e4480;
              border-radius: 6px;
              cursor: pointer;
              font-size: 12px;
              \${currentTicket.call ? 'opacity: 0.5; cursor: not-allowed;' : ''}
            " \${currentTicket.call ? 'disabled' : ''}>📢 Call Ticket</button>
          </div>
        </div>
        
        \${currentTicket.patientName ? \`
          <div style="background: #dbeafe; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
            <h3 style="margin: 0 0 8px 0; color: #1d4ed8; font-size: 18px;">Patient Name</h3>
            <p style="margin: 0; color: #374151;">\${currentTicket.patientName}</p>
          </div>
        \` : ''}
        
        \${currentTicket.reasonforVisit ? \`
          <div style="background: #dbeafe; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
            <h3 style="margin: 0 0 8px 0; color: #1d4ed8; font-size: 18px;">Reason for Visit</h3>
            <p style="margin: 0; color: #374151;">\${currentTicket.reasonforVisit}</p>
          </div>
        \` : ''}
        
        \${currentTicket.departmentHistory ? \`
          <div style="background: #dbeafe; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
            <h3 style="margin: 0 0 12px 0; color: #1d4ed8; font-size: 18px;">Ticket Journey</h3>
            \${currentTicket.departmentHistory.map(history => \`
              <div style="background: linear-gradient(135deg, #dbeafe 0%, #d1fae5 100%); padding: 16px; border-radius: 8px; margin-bottom: 12px; border: 1px solid #93c5fd;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span style="font-weight: 500; display: flex; align-items: center;">
                    \${history.icon ? \`<span style="margin-right: 8px; font-size: 18px;">\${history.icon}</span>\` : ''}
                    \${history.department}
                    \${history.completed ? '<span style="margin-left: 8px; background: #d1fae5; color: #047857; padding: 2px 8px; border-radius: 4px; font-size: 12px; border: 1px solid #10b981;">Completed</span>' : '<span style="margin-left: 8px; background: #dbeafe; color: #1d4ed8; padding: 2px 8px; border-radius: 4px; font-size: 12px; border: 1px solid #3b82f6;">Pending</span>'}
                  </span>
                  <span style="font-size: 12px; color: #1d4ed8;">\${new Date(history.timestamp).toLocaleString()}</span>
                </div>
                \${history.note ? \`<p style="margin: 8px 0 0 0; background: white; padding: 8px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); font-size: 14px;">\${history.note}</p>\` : ''}
              </div>
            \`).join('')}
          </div>
        \` : ''}
        
        <div>
          <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #374151;">Department Note</label>
          <textarea id="department-note" placeholder="Add any additional notes here..." style="width: 100%; height: 120px; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; resize: vertical; font-family: inherit;">\${departmentNote}</textarea>
        </div>
      \`;
      
      actions.style.display = 'flex';
      actions.innerHTML = \`
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button id="hold-ticket" style="padding: 8px 16px; border: 2px solid #f59e0b; background: #fef3c7; color: #92400e; border-radius: 6px; cursor: pointer; font-size: 14px; display: flex; align-items: center; gap: 4px;">⏸️ Hold Ticket</button>
          <button id="cancel-ticket" style="padding: 8px 16px; border: 2px solid #ef4444; background: #fee2e2; color: #dc2626; border-radius: 6px; cursor: pointer; font-size: 14px; display: flex; align-items: center; gap: 4px;">❌ Cancel Ticket</button>
          <button id="next-step" style="padding: 8px 16px; border: none; background: #0e4480; color: white; border-radius: 6px; cursor: pointer; font-size: 14px; display: flex; align-items: center; gap: 4px;">👥 Next Step</button>
          <button id="clear-ticket" style="padding: 8px 16px; border: none; background: #059669; color: white; border-radius: 6px; cursor: pointer; font-size: 14px; display: flex; align-items: center; gap: 4px;">✅ Clear Ticket</button>
        </div>
      \`;
      
      // Add event listeners for current ticket actions
      addCurrentTicketEventListeners();
    } else {
      desc.textContent = 'No active ticket';
      content.innerHTML = \`
        <div style="background: #dbeafe; border: 1px solid #93c5fd; border-radius: 8px; padding: 16px; text-align: center; color: #1e40af;">
          <div style="margin-bottom: 8px;">⚠️</div>
          <div>\${isServing ? 'No ticket currently being served. Click "Next Ticket" to get the next ticket in queue.' : 'Click "Start Serving" to begin serving tickets'}</div>
        </div>
      \`;
      actions.style.display = 'none';
    }
  }
  
  function updateHeldTicketsUI() {
    const content = document.getElementById('held-tickets-content');
    
    if (heldTickets.length > 0) {
      content.innerHTML = heldTickets.map(ticket => \`
        <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; border-radius: 8px; margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <h3 style="margin: 0; color: #0e4480; font-size: 16px;">\${ticket.ticketNo}</h3>
            <button onclick="unholdTicket('\${ticket._id}')" style="padding: 4px 8px; border: 1px solid #22c55e; background: white; color: #22c55e; border-radius: 4px; cursor: pointer; font-size: 12px;">▶️ Return</button>
          </div>
          \${ticket.patientName ? \`<p style="margin: 0 0 4px 0; color: #374151; font-size: 14px; font-weight: 500;">Patient: \${ticket.patientName}</p>\` : ''}
          \${ticket.reasonforVisit ? \`<p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">\${ticket.reasonforVisit}</p>\` : ''}
          \${ticket.departmentNote ? \`
            <div style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #d1fae5;">
              <p style="margin: 0 0 4px 0; font-weight: 500; font-size: 12px; color: #374151;">Notes:</p>
              <p style="margin: 0; color: #6b7280; font-size: 12px;">\${ticket.departmentNote}</p>
            </div>
          \` : ''}
        </div>
      \`).join('');
    } else {
      content.innerHTML = \`
        <div style="text-align: center; color: #64748b; padding: 40px;">
          <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;">⏸️</div>
          <p>No tickets are currently on hold</p>
        </div>
      \`;
    }
  }
  
  function addCurrentTicketEventListeners() {
    // Update department note on change
    const noteTextarea = document.getElementById('department-note');
    if (noteTextarea) {
      noteTextarea.addEventListener('input', (e) => {
        departmentNote = e.target.value;
      });
    }
    
    // Emergency toggle
    const emergencyBtn = document.getElementById('emergency-toggle');
    if (emergencyBtn) {
      emergencyBtn.addEventListener('click', async () => {
        try {
          const response = await fetch(\`/api/hospital/ticket/\${currentTicket._id}\`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              emergency: !currentTicket.emergency,
              currentDepartment: session?.department
            })
          });
          
          if (response.ok) {
            currentTicket.emergency = !currentTicket.emergency;
            updateCurrentTicketUI();
          }
        } catch (error) {
          console.error('Error updating emergency status:', error);
        }
      });
    }
    
    // Call ticket
    const callBtn = document.getElementById('call-ticket');
    if (callBtn && !currentTicket.call) {
      callBtn.addEventListener('click', async () => {
        try {
          const response = await fetch(\`/api/hospital/ticket/\${currentTicket._id}\`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ call: true })
          });
          
          if (response.ok) {
            const updatedTicket = await response.json();
            currentTicket = { ...currentTicket, ...updatedTicket };
            updateCurrentTicketUI();
          }
        } catch (error) {
          console.error('Error calling ticket:', error);
        }
      });
    }
    
    // Hold ticket
    document.getElementById('hold-ticket')?.addEventListener('click', holdTicket);
    document.getElementById('cancel-ticket')?.addEventListener('click', cancelTicket);
    document.getElementById('next-step')?.addEventListener('click', showNextStepDialog);
    document.getElementById('clear-ticket')?.addEventListener('click', clearTicket);
  }
  
  async function startServing() {
    if (!roomId) return;
    
    try {
      const response = await fetch(\`/api/hospital/room/\${roomId}\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ available: true })
      });
      
      if (response.ok) {
        isServing = true;
        await fetchNextTicket();
        updateCurrentTicketUI();
      }
    } catch (error) {
      console.error('Error starting serving:', error);
    }
  }
  
  async function fetchNextTicket() {
    if (currentTicket) return;
    
    try {
      await fetchTickets();
      
      const readyTickets = tickets.filter(ticket => {
        const currentDeptHistory = ticket.departmentHistory?.find(
          history => !history.completed && history.department === session?.department
        );
        
        if (!currentDeptHistory) return false;
        return !currentDeptHistory.roomId || currentDeptHistory.roomId === roomId;
      });
      
      if (readyTickets.length > 0) {
        const sortedTickets = readyTickets.sort((a, b) => {
          if (a.emergency && !b.emergency) return -1;
          if (!a.emergency && b.emergency) return 1;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
        
        const nextTicket = sortedTickets[0];
        
        // Assign room to ticket
        await fetch(\`/api/hospital/ticket/\${nextTicket._id}/assign-room\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId: roomId,
            department: session.department
          })
        });
        
        currentTicket = nextTicket;
        
        // Update room serving ticket
        await fetch(\`/api/hospital/room/\${roomId}\`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentTicket: nextTicket._id })
        });
        
        if (nextTicket.departmentNote) {
          departmentNote = nextTicket.departmentNote;
        } else {
          departmentNote = '';
        }
        
        tickets = tickets.filter(ticket => ticket._id !== nextTicket._id);
        updateUI();
        updateCurrentTicketUI();
      }
    } catch (error) {
      console.error('Error fetching next ticket:', error);
    }
  }
  
  async function holdTicket() {
    if (!currentTicket || !session?.department) return;
    
    try {
      const response = await fetch(\`/api/hospital/ticket/\${currentTicket._id}\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          held: true,
          departmentNote: departmentNote,
          currentDepartment: session.department,
          roomId
        })
      });
      
      if (response.ok) {
        currentTicket = null;
        await fetch(\`/api/hospital/room/\${roomId}\`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentTicket: null })
        });
        
        departmentNote = '';
        await fetchTickets();
        updateCurrentTicketUI();
      }
    } catch (error) {
      console.error('Error holding ticket:', error);
    }
  }
  
  async function cancelTicket() {
    if (!currentTicket) return;
    
    try {
      const response = await fetch(\`/api/hospital/ticket/\${currentTicket._id}\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noShow: true,
          departmentNote: departmentNote
        })
      });
      
      if (response.ok) {
        currentTicket = null;
        await fetch(\`/api/hospital/room/\${roomId}\`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentTicket: null })
        });
        
        departmentNote = '';
        await fetchTickets();
        updateCurrentTicketUI();
      }
    } catch (error) {
      console.error('Error cancelling ticket:', error);
    }
  }
  
  async function clearTicket() {
    if (!currentTicket || !session?.department) return;
    
    try {
      const response = await fetch(\`/api/hospital/ticket/\${currentTicket._id}/clear\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departmentNote: departmentNote,
          currentDepartment: session.department,
          roomId
        })
      });
      
      if (response.ok) {
        currentTicket = null;
        await fetch(\`/api/hospital/room/\${roomId}\`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentTicket: null })
        });
        
        departmentNote = '';
        await fetchTickets();
        updateCurrentTicketUI();
      }
    } catch (error) {
      console.error('Error clearing ticket:', error);
    }
  }
  
  function showNextStepDialog() {
    if (!currentTicket || !session?.department) return;
    
    // Create department selection dialog
    const dialog = document.createElement('div');
    dialog.style.cssText = \`
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      z-index: 1000004;
      display: flex;
      align-items: center;
      justify-content: center;
    \`;
    
    dialog.innerHTML = \`
      <div style="background: white; padding: 24px; border-radius: 12px; max-width: 500px; width: 90%;">
        <h3 style="margin: 0 0 16px 0; color: #0e4480;">Select Next Department</h3>
        <div id="department-list" style="max-height: 300px; overflow-y: auto;">
          \${departments.map(dept => \`
            <div style="border: 2px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 12px; cursor: pointer; transition: all 0.2s;" 
                 onclick="selectDepartment('\${dept._id}')" 
                 onmouseover="this.style.borderColor='#0e4480'; this.style.backgroundColor='#f0f9ff';"
                 onmouseout="this.style.borderColor='#e5e7eb'; this.style.backgroundColor='white';">
              <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 24px;">\${dept.icon}</span>
                <span style="font-weight: 500; color: #374151;">\${dept.title}</span>
              </div>
            </div>
          \`).join('')}
        </div>
        <button onclick="this.parentElement.parentElement.remove()" style="
          margin-top: 16px;
          padding: 8px 16px;
          border: 1px solid #d1d5db;
          background: white;
          border-radius: 6px;
          cursor: pointer;
        ">Cancel</button>
      </div>
    \`;
    
    document.body.appendChild(dialog);
    
    window.selectDepartment = async (departmentId) => {
      try {
        const response = await fetch(\`/api/hospital/ticket/\${currentTicket._id}/next-step\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            departmentId,
            departmentNote: departmentNote,
            currentDepartment: session.department
          })
        });
        
        if (response.ok) {
          currentTicket = null;
          await fetch(\`/api/hospital/room/\${roomId}\`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentTicket: null })
          });
          
          departmentNote = '';
          await fetchTickets();
          updateCurrentTicketUI();
          dialog.remove();
        }
      } catch (error) {
        console.error('Error assigning next step:', error);
      }
    };
  }
  
  // Global function for unholding tickets
  window.unholdTicket = async function(ticketId) {
    try {
      const response = await fetch(\`/api/hospital/ticket/\${ticketId}\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          held: false,
          currentDepartment: session?.department,
          roomId: roomId
        })
      });
      
      if (response.ok) {
        const updatedTicket = await response.json();
        
        if (currentTicket) {
          alert('Please complete the current ticket first');
          return;
        }
        
        // Assign room to ticket
        await fetch(\`/api/hospital/ticket/\${ticketId}/assign-room\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId: roomId,
            department: session.department
          })
        });
        
        currentTicket = updatedTicket;
        
        // Update room serving ticket
        await fetch(\`/api/hospital/room/\${roomId}\`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentTicket: ticketId })
        });
        
        if (updatedTicket.departmentNote) {
          departmentNote = updatedTicket.departmentNote;
        } else {
          departmentNote = '';
        }
        
        await fetchTickets();
        updateCurrentTicketUI();
      }
    } catch (error) {
      console.error('Error unholding ticket:', error);
    }
  };
  
  // Event handlers
  servingButton.addEventListener('mouseenter', () => {
    servingButton.style.transform = 'scale(1.1)';
  });
  
  servingButton.addEventListener('mouseleave', () => {
    servingButton.style.transform = 'scale(1)';
  });
  
  servingButton.addEventListener('click', () => {
    servingModal.style.display = 'flex';
    initialize();
  });
  
  document.getElementById('close-serving').addEventListener('click', () => {
    servingModal.style.display = 'none';
  });
  
  document.getElementById('refresh-tickets').addEventListener('click', fetchTickets);
  
  document.getElementById('control-panel-btn').addEventListener('click', () => {
    // Create control panel dialog
    const dialog = document.createElement('div');
    dialog.style.cssText = \`
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      z-index: 1000004;
      display: flex;
      align-items: center;
      justify-content: center;
    \`;
    
    dialog.innerHTML = \`
      <div style="background: white; padding: 24px; border-radius: 12px; max-width: 400px; width: 90%;">
        <h3 style="margin: 0 0 16px 0; color: #0e4480;">\${departmentName} Actions</h3>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          \${isServing ? \`
            <button onclick="pauseServing()" style="
              padding: 12px;
              border: 2px solid #ef4444;
              background: #fee2e2;
              color: #dc2626;
              border-radius: 8px;
              cursor: pointer;
              font-weight: 500;
            ">⏸️ Pause Serving</button>
            <button onclick="fetchNextTicket(); this.parentElement.parentElement.parentElement.remove();" style="
              padding: 12px;
              border: none;
              background: #3b82f6;
              color: white;
              border-radius: 8px;
              cursor: pointer;
              font-weight: 500;
            ">➡️ Next Ticket</button>
          \` : \`
            <button onclick="startServing(); this.parentElement.parentElement.parentElement.remove();" style="
              padding: 12px;
              border: none;
              background: #059669;
              color: white;
              border-radius: 8px;
              cursor: pointer;
              font-weight: 500;
            ">▶️ Start Serving</button>
          \`}
        </div>
        <button onclick="this.parentElement.parentElement.remove()" style="
          margin-top: 16px;
          padding: 8px 16px;
          border: 1px solid #d1d5db;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          width: 100%;
        ">Close</button>
      </div>
    \`;
    
    document.body.appendChild(dialog);
    
    window.pauseServing = async () => {
      if (currentTicket) {
        alert('Please complete or hold the current ticket before pausing');
        return;
      }
      
      try {
        await fetch(\`/api/hospital/room/\${roomId}\`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentTicket: null })
        });
        
        isServing = false;
        currentTicket = null;
        await fetch(\`/api/hospital/room/\${roomId}\`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentTicket: null })
        });
        
        updateCurrentTicketUI();
        dialog.remove();
      } catch (error) {
        console.error('Error pausing serving:', error);
      }
    };
    
    window.startServing = startServing;
    window.fetchNextTicket = fetchNextTicket;
  });
  
  // Auto-refresh tickets every 60 seconds
  setInterval(fetchTickets, 60000);
  
  console.log('🏥 Department Serving widget activated!');
}`

  const copyScript = (scriptContent: string, widgetName: string) => {
    navigator.clipboard.writeText(scriptContent)
    alert(`${widgetName} script copied to clipboard! 

To use:
1. Go to any website where you want the widget
2. Open browser console (F12 → Console)
3. Paste the script and press Enter
4. Widget will appear on the right side of the screen`)
  }

  const activateWidget = (scriptContent: string) => {
    try {
      const script = document.createElement("script")
      script.textContent = scriptContent
      document.body.appendChild(script)
      document.body.removeChild(script)
    } catch (error) {
      console.error("Error activating widget:", error)
      alert("Error activating widget. Check console for details.")
    }
  }

  const downloadAllScripts = () => {
    const allScripts = `// Hospital Management System Floating Widgets
// Direct conversion from your existing React components

${loginWidgetScript}

${receptionistWidgetScript}

${servingWidgetScript}

// Auto-activate login widget on page load
${loginWidgetScript.replace("(function() {", "").replace("})();", "")}`

    const blob = new Blob([allScripts], { type: "text/javascript" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `hospital-widgets-${new Date().toISOString().split("T")[0]}.js`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🏥 Hospital Management Floating Widgets</h1>
          <p className="text-gray-600">Direct conversion of your existing components into floating widgets</p>
        </div>

        {/* Widget Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Hospital className="h-6 w-6" />
                Staff Login Widget
              </CardTitle>
              <CardDescription>Exact replica of serving-login-page.tsx</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Badge className="bg-blue-100 text-blue-800">🔐 Session Management</Badge>
                <Badge className="bg-blue-100 text-blue-800">🏢 Department Selection</Badge>
                <Badge className="bg-blue-100 text-blue-800">🏠 Room Assignment</Badge>
                <Badge className="bg-blue-100 text-blue-800">🔄 Auto Widget Activation</Badge>
              </div>
              <div className="mt-4 space-y-2">
                <Button
                  onClick={() => copyScript(loginWidgetScript, "Staff Login")}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  📋 Copy Login Widget
                </Button>
                <Button
                  onClick={() => activateWidget(loginWidgetScript)}
                  variant="outline"
                  className="w-full border-blue-300 text-blue-600"
                >
                  🚀 Test Widget
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-green-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <Users className="h-6 w-6" />
                Receptionist Widget
              </CardTitle>
              <CardDescription>Exact replica of receptionist-page.tsx</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Badge className="bg-green-100 text-green-800">📊 Live Queue Management</Badge>
                <Badge className="bg-green-100 text-green-800">🎫 Ticket Processing</Badge>
                <Badge className="bg-green-100 text-green-800">👥 Patient Information</Badge>
                <Badge className="bg-green-100 text-green-800">🔄 Department Routing</Badge>
              </div>
              <div className="mt-4 space-y-2">
                <Button
                  onClick={() => copyScript(receptionistWidgetScript, "Receptionist Dashboard")}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  📋 Copy Reception Widget
                </Button>
                <Button
                  onClick={() => activateWidget(receptionistWidgetScript)}
                  variant="outline"
                  className="w-full border-green-300 text-green-600"
                >
                  🚀 Test Widget
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-purple-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-800">
                <Hospital className="h-6 w-6" />
                Serving Widget
              </CardTitle>
              <CardDescription>Exact replica of serving-page.tsx</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Badge className="bg-purple-100 text-purple-800">🏥 Department Management</Badge>
                <Badge className="bg-purple-100 text-purple-800">📝 Patient Notes</Badge>
                <Badge className="bg-purple-100 text-purple-800">⏸️ Ticket Holding</Badge>
                <Badge className="bg-purple-100 text-purple-800">🔄 Journey Tracking</Badge>
              </div>
              <div className="mt-4 space-y-2">
                <Button
                  onClick={() => copyScript(servingWidgetScript, "Department Serving")}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  📋 Copy Serving Widget
                </Button>
                <Button
                  onClick={() => activateWidget(servingWidgetScript)}
                  variant="outline"
                  className="w-full border-purple-300 text-purple-600"
                >
                  🚀 Test Widget
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Implementation Instructions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-gray-800">🚀 How to Use</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-blue-800">📝 Quick Setup</h4>
                  <ol className="text-sm text-gray-600 space-y-2">
                    <li>
                      1. <strong>Copy Widget Script:</strong> Click the copy button for any widget
                    </li>
                    <li>
                      2. <strong>Open Any Website:</strong> Navigate to where you want the widget
                    </li>
                    <li>
                      3. <strong>Open Console:</strong> Press F12 and go to Console tab
                    </li>
                    <li>
                      4. <strong>Paste & Execute:</strong> Paste the script and press Enter
                    </li>
                    <li>
                      5. <strong>Use Widget:</strong> Click the floating button to access your dashboard
                    </li>
                  </ol>
                </div>
                <div className="space-y-4">
                  <h4 className="font-semibold text-green-800">✨ Features</h4>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li>
                      • <strong>Exact Functionality:</strong> Same as your original components
                    </li>
                    <li>
                      • <strong>Same API Calls:</strong> Uses your existing endpoints
                    </li>
                    <li>
                      • <strong>Session Management:</strong> Maintains login state
                    </li>
                    <li>
                      • <strong>Auto-Activation:</strong> Widgets activate based on permissions
                    </li>
                    <li>
                      • <strong>Cross-Site Access:</strong> Works on any website
                    </li>
                  </ul>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">💡 Widget Flow</h4>
                <p className="text-sm text-blue-700">
                  1. Start with the <strong>Login Widget</strong> → 2. After login, it automatically activates the
                  appropriate dashboard widget (<strong>Receptionist</strong> or <strong>Serving</strong>) based on your
                  department → 3. All widgets maintain the same functionality as your original pages
                </p>
              </div>

              <div className="flex gap-4">
                <Button onClick={downloadAllScripts} className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Download All Widgets
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Technical Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-gray-800">🔧 Technical Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3 text-purple-800">🎯 Widget Positioning</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Login Widget: Top right (80px from top)</li>
                    <li>• Reception Widget: Below login (150px from top)</li>
                    <li>• Serving Widget: Below reception (220px from top)</li>
                    <li>• All widgets: 20px from right edge</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3 text-purple-800">⚡ Performance</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Auto-refresh tickets every 60 seconds</li>
                    <li>• Auto-fetch next ticket when serving</li>
                    <li>• Session persistence across page reloads</li>
                    <li>• Minimal DOM impact when inactive</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
