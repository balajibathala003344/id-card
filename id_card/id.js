// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAK7EeqBnJUmEyZKXZNjVHwHMIkJrx3S1o",
    authDomain: "idcard-89801.firebaseapp.com",
    databaseURL: "https://idcard-89801-default-rtdb.firebaseio.com",
    projectId: "idcard-89801",
    storageBucket: "idcard-89801.firebasestorage.app",
    messagingSenderId: "304235708580",
    appId: "1:304235708580:web:eedbeeda722017523fe631",
    measurementId: "G-1BTRN1YNCQ"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();
const storage = firebase.storage();

// Global variables
let currentUser = null;
let userType = null;
let isAdminRegistering = false;
let currentStudentFilter = 'all';

// Utility function to compress image
function compressImage(file, maxWidth = 800, quality = 0.7) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
            const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
            canvas.width = img.width * ratio;
            canvas.height = img.height * ratio;
            
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(resolve, 'image/jpeg', quality);
        };
        
        img.src = URL.createObjectURL(file);
    });
}

// Fast upload with progress
async function fastUpload(file, path, progressCallback) {
    try {
        const compressedFile = await compressImage(file, 600, 0.6);
        const storageRef = storage.ref(path);
        const uploadTask = storageRef.put(compressedFile);
        
        return new Promise((resolve, reject) => {
            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    if (progressCallback) progressCallback(progress);
                },
                (error) => reject(error),
                async () => {
                    try {
                        const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                        resolve(downloadURL);
                    } catch (error) {
                        reject(error);
                    }
                }
            );
        });
    } catch (error) {
        throw error;
    }
}

// Page management
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
    clearErrors();
}

function showLoading() {
    document.getElementById('loading').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    errorElement.textContent = message;
    errorElement.classList.add('show');
}

function clearErrors() {
    document.querySelectorAll('.error-message').forEach(error => {
        error.classList.remove('show');
        error.textContent = '';
    });
    
    document.querySelectorAll('.message').forEach(message => {
        message.style.display = 'none';
        message.textContent = '';
    });
}

function showMessage(elementId, message, type = 'success') {
    const messageElement = document.getElementById(elementId);
    messageElement.textContent = message;
    messageElement.className = `message ${type}`;
    messageElement.style.display = 'block';
}

// Password toggle
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const button = input.parentElement.querySelector('.toggle-password i');
    
    if (input.type === 'password') {
        input.type = 'text';
        button.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        button.className = 'fas fa-eye';
    }
}

// Admin authentication toggle
function toggleAdminMode() {
    isAdminRegistering = !isAdminRegistering;
    
    const title = document.getElementById('admin-auth-title');
    const subtitle = document.getElementById('admin-auth-subtitle');
    const collegeField = document.getElementById('college-name-field');
    const btnText = document.getElementById('admin-btn-text');
    const switchBtn = document.getElementById('admin-switch-btn');
    
    if (isAdminRegistering) {
        title.textContent = 'Admin Registration';
        subtitle.textContent = 'Create your admin account';
        collegeField.style.display = 'block';
        btnText.textContent = 'Register';
        switchBtn.textContent = 'Already have an account? Login';
        document.getElementById('admin-college').required = true;
    } else {
        title.textContent = 'Admin Login';
        subtitle.textContent = 'Access your admin dashboard';
        collegeField.style.display = 'none';
        btnText.textContent = 'Login';
        switchBtn.textContent = "Don't have an account? Register";
        document.getElementById('admin-college').required = false;
    }
    
    clearErrors();
}

// Photo preview for request form
document.getElementById('request-photo').addEventListener('change', function(e) {
    const file = e.target.files[0];
    const preview = document.getElementById('photo-preview');
    const placeholder = document.getElementById('upload-placeholder');
    const previewImg = document.getElementById('preview-image');
    
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImg.src = e.target.result;
            preview.style.display = 'block';
            placeholder.style.display = 'none';
        };
        reader.readAsDataURL(file);
    } else {
        preview.style.display = 'none';
        placeholder.style.display = 'block';
    }
});

// Photo preview for student dashboard
document.getElementById('photo-input').addEventListener('change', function(e) {
    const file = e.target.files[0];
    const preview = document.getElementById('student-photo-preview');
    const placeholder = document.getElementById('student-upload-placeholder');
    const previewImg = document.getElementById('student-preview-image');
    
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImg.src = e.target.result;
            preview.style.display = 'block';
            placeholder.style.display = 'none';
        };
        reader.readAsDataURL(file);
    } else {
        preview.style.display = 'none';
        placeholder.style.display = 'block';
    }
});

// Authentication state observer
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        try {
            userType = await getCurrentUserType(user);
            
            if (userType === 'admin') {
                showPage('admin-dashboard');
                loadAdminDashboard();
            } else if (userType === 'student') {
                showPage('student-dashboard');
                loadStudentDashboard();
            } else {
                showPage('welcome-page');
            }
        } catch (error) {
            console.error('Failed to determine user type:', error);
            showPage('welcome-page');
        }
    } else {
        currentUser = null;
        userType = null;
        showPage('welcome-page');
    }
    
    hideLoading();
});

// Get current user type
async function getCurrentUserType(user) {
    const adminSnapshot = await database.ref(`admins/${user.uid}`).once('value');
    if (adminSnapshot.exists()) {
        return 'admin';
    }
    
    const studentSnapshot = await database.ref(`students/${user.uid}`).once('value');
    if (studentSnapshot.exists()) {
        return 'student';
    }
    
    return null;
}

// Admin form submission
document.getElementById('admin-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;
    const collegeName = document.getElementById('admin-college').value;
    
    const btnText = document.getElementById('admin-btn-text');
    const originalText = btnText.textContent;
    btnText.textContent = 'Processing...';
    
    try {
        if (isAdminRegistering) {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            await database.ref(`admins/${user.uid}`).set({
                name: collegeName,
                address: '',
                logo: '',
                email: email,
                createdAt: Date.now()
            });
        } else {
            await auth.signInWithEmailAndPassword(email, password);
        }
    } catch (error) {
        console.error('Admin auth error:', error);
        showError('admin-error', error.message);
        btnText.textContent = originalText;
    }
});

// Student form submission
document.getElementById('student-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('student-email').value;
    const password = document.getElementById('student-password').value;
    
    const btnText = document.getElementById('student-btn-text');
    btnText.textContent = 'Logging in...';
    
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        const studentSnapshot = await database.ref(`students/${user.uid}`).once('value');
        
        if (!studentSnapshot.exists()) {
            await auth.signOut();
            throw new Error('Student not approved or account deleted');
        }
    } catch (error) {
        console.error('Student login error:', error);
        showError('student-error', error.message);
        btnText.textContent = 'Login';
    }
});

// Request access form submission
document.getElementById('request-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('request-name').value;
    const email = document.getElementById('request-email').value;
    const roll = document.getElementById('request-roll').value;
    const bloodGroup = document.getElementById('request-blood-group').value;
    const graduationYear = document.getElementById('request-graduation-year').value;
    const address = document.getElementById('request-address').value;
    const adminEmail = document.getElementById('request-admin-email').value;
    const photoURL = document.getElementById('request-photo-url').value;
    const photoFile = document.getElementById('request-photo').files[0];
    
    const btnText = document.getElementById('request-btn-text');
    btnText.textContent = 'Submitting...';
    
    try {
        let finalPhotoURL = photoURL;
        
        if (!photoURL && photoFile) {
            if (photoFile.size > 1024 * 1024) {
                throw new Error('Photo file size must be less than 1MB');
            }
            
            const progressBar = document.getElementById('request-upload-progress');
            const progressFill = document.getElementById('request-progress-fill');
            const progressText = document.getElementById('request-progress-text');
            
            progressBar.style.display = 'block';
            
            finalPhotoURL = await fastUpload(
                photoFile,
                `request-photos/${Date.now()}_${photoFile.name}`,
                (progress) => {
                    progressFill.style.width = `${progress}%`;
                    progressText.textContent = `${Math.round(progress)}%`;
                }
            );
            
            progressBar.style.display = 'none';
        }
        
        const requestId = database.ref('requests').push().key;
        
        await database.ref(`requests/${requestId}`).set({
            id: requestId,
            name: name,
            email: email,
            roll: roll,
            bloodGroup: bloodGroup,
            graduationYear: graduationYear,
            address: address,
            adminEmail: adminEmail,
            photoURL: finalPhotoURL,
            timestamp: Date.now(),
            status: 'pending'
        });
        
        showPage('request-success');
    } catch (error) {
        console.error('Request submission error:', error);
        showError('request-error', error.message);
        btnText.textContent = 'Submit Request';
    }
});

// Student details form submission
document.getElementById('student-details-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const bloodGroup = document.getElementById('student-blood-group').value;
    const graduationYear = document.getElementById('student-graduation-year').value;
    const address = document.getElementById('student-address').value;
    
    try {
        await database.ref(`students/${currentUser.uid}`).update({
            bloodGroup: bloodGroup,
            graduationYear: graduationYear,
            address: address,
            updatedAt: Date.now()
        });
        
        alert('Details updated successfully!');
        await loadStudentDashboard();
    } catch (error) {
        console.error('Failed to update details:', error);
        alert('Failed to update details: ' + error.message);
    }
});

// Logout function
async function logout() {
    try {
        await auth.signOut();
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Tab management
function showTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[onclick="showTab('${tabId}')"]`).classList.add('active');
    
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    document.getElementById(`${tabId}-tab`).classList.add('active');
    
    if (tabId === 'requests') {
        loadPendingRequests();
    } else if (tabId === 'students') {
        loadAllStudents();
    } else if (tabId === 'settings') {
        loadCollegeSettings();
    } else if (tabId === 'id-generation') {
        loadIDGenerationTab();
    }
}

// Load admin dashboard
async function loadAdminDashboard() {
    try {
        await loadStats();
        await loadCollegeSettings();
    } catch (error) {
        console.error('Failed to load admin dashboard:', error);
    }
}

// Load stats
async function loadStats() {
    try {
        const requestsSnapshot = await database.ref('requests').once('value');
        const studentsSnapshot = await database.ref('students').once('value');
        
        let pendingCount = 0;
        let approvedCount = 0;
        let cardsGenerated = 0;
        
        if (requestsSnapshot.exists()) {
            const requests = requestsSnapshot.val();
            pendingCount = Object.keys(requests).filter(key => 
                requests[key].status === 'pending'
            ).length;
        }
        
        if (studentsSnapshot.exists()) {
            const students = studentsSnapshot.val();
            const adminStudents = Object.keys(students).filter(uid => 
                students[uid].admin === currentUser.uid
            );
            approvedCount = adminStudents.length;
            cardsGenerated = adminStudents.filter(uid => 
                students[uid].photoURL && students[uid].photoURL !== ''
            ).length;
        }
        
        document.getElementById('pending-count').textContent = pendingCount;
        document.getElementById('approved-count').textContent = approvedCount;
        document.getElementById('cards-generated').textContent = cardsGenerated;
        document.getElementById('requests-badge').textContent = pendingCount;
        
        if (pendingCount === 0) {
            document.getElementById('requests-badge').style.display = 'none';
        } else {
            document.getElementById('requests-badge').style.display = 'inline';
        }
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

// Load college settings
async function loadCollegeSettings() {
    try {
        const snapshot = await database.ref(`admins/${currentUser.uid}`).once('value');
        
        if (snapshot.exists()) {
            const info = snapshot.val();
            document.getElementById('college-name').value = info.name || '';
            document.getElementById('college-address').value = info.address || '';
            document.getElementById('college-logo').value = info.logo || '';
            
            if (info.logo) {
                showLogoPreview(info.logo);
            }
        }
    } catch (error) {
        console.error('Failed to load college settings:', error);
    }
}

// Logo preview
document.getElementById('college-logo').addEventListener('input', (e) => {
    const url = e.target.value;
    if (url) {
        showLogoPreview(url);
    } else {
        document.getElementById('logo-preview').style.display = 'none';
    }
});

function showLogoPreview(url) {
    const preview = document.getElementById('logo-preview');
    const img = document.getElementById('preview-img');
    
    img.src = url;
    img.onload = () => {
        preview.style.display = 'block';
    };
    img.onerror = () => {
        preview.style.display = 'none';
    };
}

// Settings form submission
document.getElementById('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('college-name').value;
    const address = document.getElementById('college-address').value;
    const logo = document.getElementById('college-logo').value;
    
    const btnText = document.getElementById('settings-btn-text');
    btnText.textContent = 'Saving...';
    
    try {
        const existingSnapshot = await database.ref(`admins/${currentUser.uid}`).once('value');
        const existingInfo = existingSnapshot.val() || {};
        
        await database.ref(`admins/${currentUser.uid}`).set({
            ...existingInfo,
            name: name,
            address: address,
            logo: logo,
            updatedAt: Date.now()
        });
        
        showMessage('settings-message', 'College information updated successfully!', 'success');
    } catch (error) {
        console.error('Failed to save settings:', error);
        showMessage('settings-message', 'Failed to update college information', 'error');
    } finally {
        btnText.textContent = 'Save Settings';
    }
});

// Load pending requests
async function loadPendingRequests() {
    try {
        const snapshot = await database.ref('requests').once('value');
        const requestsList = document.getElementById('requests-list');
        
        if (!snapshot.exists()) {
            requestsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clock"></i>
                    <h3>No Pending Requests</h3>
                    <p>All access requests have been processed.</p>
                </div>
            `;
            return;
        }
        
        const requests = [];
        snapshot.forEach(child => {
            const requestData = child.val();
            if (requestData.status === 'pending') {
                requests.push({
                    id: child.key,
                    ...requestData
                });
            }
        });
        
        if (requests.length === 0) {
            requestsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clock"></i>
                    <h3>No Pending Requests</h3>
                    <p>All access requests have been processed.</p>
                </div>
            `;
            return;
        }
        
        requests.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        
        requestsList.innerHTML = requests.map(request => `
            <div class="request-item">
                <div class="request-header">
                    <div class="request-field">
                        <i class="fas fa-user"></i>
                        <div>
                            <p>Name</p>
                            <strong>${request.name}</strong>
                        </div>
                    </div>
                    <div class="request-field">
                        <i class="fas fa-envelope"></i>
                        <div>
                            <p>Email</p>
                            <strong>${request.email}</strong>
                        </div>
                    </div>
                    <div class="request-field">
                        <i class="fas fa-hashtag"></i>
                        <div>
                            <p>Roll Number</p>
                            <strong>${request.roll}</strong>
                        </div>
                    </div>
                    <div class="request-field">
                        <i class="fas fa-tint"></i>
                        <div>
                            <p>Blood Group</p>
                            <strong>${request.bloodGroup || 'Not provided'}</strong>
                        </div>
                    </div>
                    <div class="request-field">
                        <i class="fas fa-calendar"></i>
                        <div>
                            <p>Graduation Year</p>
                            <strong>${request.graduationYear || 'Not provided'}</strong>
                        </div>
                    </div>
                    <div class="request-field">
                        <i class="fas fa-map-marker-alt"></i>
                        <div>
                            <p>Address</p>
                            <strong>${request.address || 'Not provided'}</strong>
                        </div>
                    </div>
                    <div class="request-field">
                        <i class="fas fa-user-shield"></i>
                        <div>
                            <p>Admin Email</p>
                            <strong>${request.adminEmail}</strong>
                        </div>
                    </div>
                    <div class="request-field">
                        <i class="fas fa-image"></i>
                        <div>
                            <p>Photo</p>
                            ${request.photoURL ? 
                                `<img src="${request.photoURL}" class="student-photo-thumb" onclick="showPhotoModal('${request.photoURL}')" alt="Student Photo">` : 
                                '<strong>No photo</strong>'
                            }
                        </div>
                    </div>
                </div>
                ${request.timestamp ? `<p class="request-date">Requested on ${new Date(request.timestamp).toLocaleDateString()}</p>` : ''}
                <div class="request-actions">
                    <button class="btn btn-success" onclick="approveRequest('${request.id}')">
                        <i class="fas fa-check"></i>
                        Approve
                    </button>
                    <button class="btn" style="background: #e53e3e; color: white;" onclick="rejectRequest('${request.id}')">
                        <i class="fas fa-times"></i>
                        Reject
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load requests:', error);
    }
}

// Approve request
async function approveRequest(requestId) {
    if (!confirm('Are you sure you want to approve this student?')) {
        return;
    }
    
    try {
        const requestSnapshot = await database.ref(`requests/${requestId}`).once('value');
        if (!requestSnapshot.exists()) {
            throw new Error('Request not found');
        }
        
        const requestData = requestSnapshot.val();
        const { name, email, roll, bloodGroup, graduationYear, address, photoURL } = requestData;
        
        const currentAdminUser = currentUser;
        
        let userCredential;
        try {
            userCredential = await auth.createUserWithEmailAndPassword(email, roll);
            
            const studentData = {
                name: name,
                email: email,
                roll: roll,
                bloodGroup: bloodGroup || '',
                graduationYear: graduationYear || '',
                address: address || '',
                admin: currentAdminUser.uid,
                approved: true,
                photoURL: photoURL || '',
                createdAt: Date.now()
            };
            
            await database.ref(`students/${userCredential.user.uid}`).set(studentData);
            
            // Sign out the newly created student user and sign back in as admin
            await auth.signOut();
            await auth.signInWithEmailAndPassword(currentAdminUser.email, 'admin_password_placeholder');
            
        } catch (authError) {
            if (authError.code === 'auth/email-already-in-use') {
                const studentsSnapshot = await database.ref('students').once('value');
                let existingStudentUid = null;
                
                if (studentsSnapshot.exists()) {
                    const students = studentsSnapshot.val();
                    existingStudentUid = Object.keys(students).find(uid => 
                        students[uid].email === email
                    );
                }
                
                if (existingStudentUid) {
                    await database.ref(`students/${existingStudentUid}`).update({
                        name: name,
                        roll: roll,
                        bloodGroup: bloodGroup || '',
                        graduationYear: graduationYear || '',
                        address: address || '',
                        admin: currentAdminUser.uid,
                        approved: true,
                        photoURL: photoURL || '',
                        updatedAt: Date.now()
                    });
                } else {
                    throw new Error('Email already exists but no student record found. Please contact the student to use a different email.');
                }
            } else {
                throw authError;
            }
        }
        
        await database.ref(`requests/${requestId}`).update({
            status: 'approved',
            approvedAt: Date.now(),
            approvedBy: currentAdminUser.uid
        });
        
        await loadStats();
        await loadPendingRequests();
        
        alert('Student approved successfully! They can now login with their email and roll number.');
        
    } catch (error) {
        console.error('Failed to approve student:', error);
        alert('Failed to approve student: ' + error.message);
    }
}

// Reject request
async function rejectRequest(requestId) {
    if (!confirm('Are you sure you want to reject this request?')) {
        return;
    }
    
    try {
        await database.ref(`requests/${requestId}`).update({
            status: 'rejected',
            rejectedAt: Date.now(),
            rejectedBy: currentUser.uid
        });
        
        await loadStats();
        await loadPendingRequests();
        alert('Request rejected successfully!');
    } catch (error) {
        console.error('Failed to reject request:', error);
        alert('Failed to reject request: ' + error.message);
    }
}

// Student filter functions
function filterStudents(filter) {
    currentStudentFilter = filter;
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    loadAllStudents();
}

// Load all students with filtering
async function loadAllStudents() {
    try {
        const snapshot = await database.ref('students').once('value');
        const studentsList = document.getElementById('students-list');
        
        if (!snapshot.exists()) {
            studentsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <h3>No Students</h3>
                    <p>Students will appear here after you approve their requests.</p>
                </div>
            `;
            return;
        }
        
        let students = [];
        snapshot.forEach(child => {
            const studentData = child.val();
            if (studentData.admin === currentUser.uid) {
                students.push({
                    uid: child.key,
                    ...studentData
                });
            }
        });
        
        // Apply filters
        switch (currentStudentFilter) {
            case 'approved':
                students = students.filter(s => s.approved);
                break;
            case 'with-photo':
                students = students.filter(s => s.photoURL && s.photoURL !== '');
                break;
            case 'without-photo':
                students = students.filter(s => !s.photoURL || s.photoURL === '');
                break;
            default:
                break;
        }
        
        if (students.length === 0) {
            studentsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <h3>No Students Found</h3>
                    <p>No students match the current filter criteria.</p>
                </div>
            `;
            return;
        }
        
        studentsList.innerHTML = students.map(student => `
            <div class="student-item">
                <div class="student-header">
                    <div class="student-field">
                        <i class="fas fa-user"></i>
                        <div>
                            <p>Name</p>
                            <strong>${student.name}</strong>
                        </div>
                    </div>
                    <div class="student-field">
                        <i class="fas fa-envelope"></i>
                        <div>
                            <p>Email</p>
                            <strong>${student.email}</strong>
                        </div>
                    </div>
                    <div class="student-field">
                        <i class="fas fa-hashtag"></i>
                        <div>
                            <p>Roll Number</p>
                            <strong>${student.roll}</strong>
                        </div>
                    </div>
                    <div class="student-field">
                        <i class="fas fa-tint"></i>
                        <div>
                            <p>Blood Group</p>
                            <strong>${student.bloodGroup || 'Not set'}</strong>
                        </div>
                    </div>
                    <div class="student-field">
                        <i class="fas fa-calendar"></i>
                        <div>
                            <p>Graduation Year</p>
                            <strong>${student.graduationYear || 'Not set'}</strong>
                        </div>
                    </div>
                    <div class="student-field">
                        <i class="fas fa-map-marker-alt"></i>
                        <div>
                            <p>Address</p>
                            <strong>${student.address || 'Not set'}</strong>
                        </div>
                    </div>
                    <div class="student-field">
                        <i class="fas fa-image"></i>
                        <div>
                            <p>Photo</p>
                            ${student.photoURL ? 
                                `<img src="${student.photoURL}" class="student-photo-thumb" onclick="showPhotoModal('${student.photoURL}')" alt="Student Photo">` : 
                                '<strong>Not uploaded</strong>'
                            }
                        </div>
                    </div>
                    <div class="student-field">
                        <i class="fas fa-check-circle"></i>
                        <div>
                            <p>Status</p>
                            <strong style="color: ${student.approved ? '#48bb78' : '#e53e3e'}">${student.approved ? 'Approved' : 'Pending'}</strong>
                        </div>
                    </div>
                </div>
                <div class="student-actions">
                    ${student.photoURL && student.approved ? 
                        `<button class="btn btn-primary" onclick="generateStudentID('${student.uid}')">
                            <i class="fas fa-id-card"></i>
                            Generate ID
                        </button>` : ''
                    }
                    <button class="btn" style="background: #e53e3e; color: white;" onclick="removeStudent('${student.uid}')">
                        <i class="fas fa-trash"></i>
                        Remove
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load students:', error);
    }
}

// Remove student
async function removeStudent(studentUid) {
    if (!confirm('Are you sure you want to remove this student? This action cannot be undone.')) {
        return;
    }
    
    try {
        await database.ref(`students/${studentUid}`).remove();
        await loadStats();
        await loadAllStudents();
        alert('Student removed successfully!');
    } catch (error) {
        console.error('Failed to remove student:', error);
        alert('Failed to remove student: ' + error.message);
    }
}

// Load ID Generation tab
async function loadIDGenerationTab() {
    try {
        const snapshot = await database.ref('students').once('value');
        const singleSelect = document.getElementById('single-student-select');
        
        singleSelect.innerHTML = '<option value="">Select a student...</option>';
        
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                const studentData = child.val();
                if (studentData.admin === currentUser.uid && studentData.approved && studentData.photoURL) {
                    const option = document.createElement('option');
                    option.value = child.key;
                    option.textContent = `${studentData.name} (${studentData.roll})`;
                    singleSelect.appendChild(option);
                }
            });
        }
    } catch (error) {
        console.error('Failed to load ID generation data:', error);
    }
}

// Generate single student ID
async function generateSingleID() {
    const studentUid = document.getElementById('single-student-select').value;
    
    if (!studentUid) {
        alert('Please select a student first');
        return;
    }
    
    try {
        await generateStudentIDCard(studentUid);
    } catch (error) {
        console.error('Failed to generate single ID:', error);
        alert('Failed to generate ID card: ' + error.message);
    }
}

// Generate student ID from admin panel
async function generateStudentID(studentUid) {
    try {
        await generateStudentIDCard(studentUid);
    } catch (error) {
        console.error('Failed to generate student ID:', error);
        alert('Failed to generate ID card: ' + error.message);
    }
}

// Load student dashboard
async function loadStudentDashboard() {
    try {
        const studentSnapshot = await database.ref(`students/${currentUser.uid}`).once('value');
        
        if (!studentSnapshot.exists()) {
            throw new Error('Student data not found');
        }
        
        const studentData = studentSnapshot.val();
        
        // Update welcome section
        document.getElementById('student-welcome').textContent = `Welcome, ${studentData.name}!`;
        document.getElementById('student-roll').textContent = `Roll Number: ${studentData.roll}`;
        
        // Update info section
        document.getElementById('student-name-display').textContent = studentData.name;
        document.getElementById('student-email-display').textContent = studentData.email;
        document.getElementById('student-roll-display').textContent = studentData.roll;
        document.getElementById('student-blood-group-display').textContent = studentData.bloodGroup || 'Not Set';
        document.getElementById('student-graduation-year-display').textContent = studentData.graduationYear || 'Not Set';
        document.getElementById('student-address-display').textContent = studentData.address || 'Not Set';
        
        // Pre-fill details form
        document.getElementById('student-blood-group').value = studentData.bloodGroup || '';
        document.getElementById('student-graduation-year').value = studentData.graduationYear || '';
        document.getElementById('student-address').value = studentData.address || '';
        
        // Show/hide details section
        const detailsSection = document.getElementById('student-details-section');
        const hasAllDetails = studentData.bloodGroup && studentData.graduationYear && studentData.address;
        detailsSection.style.display = hasAllDetails ? 'none' : 'block';
        
        // Show photo upload section if no photo
        const photoSection = document.getElementById('photo-upload-section');
        const photoDisplay = document.getElementById('student-photo-display');
        
        if (studentData.photoURL) {
            photoSection.style.display = 'none';
            photoDisplay.innerHTML = `<img src="${studentData.photoURL}" alt="Student Photo" style="width: 100px; height: 100px; object-fit: cover; border-radius: 10px;">`;
        } else {
            photoSection.style.display = 'block';
            photoDisplay.innerHTML = '<p>No photo uploaded</p>';
        }
        
        // Load college info
        if (studentData.admin) {
            const collegeSnapshot = await database.ref(`admins/${studentData.admin}`).once('value');
            if (collegeSnapshot.exists()) {
                const collegeInfo = collegeSnapshot.val();
                document.getElementById('student-college-display').textContent = collegeInfo.name || 'Not Set';
                document.getElementById('student-college-address-display').textContent = collegeInfo.address || 'Not Set';
                
                // Enable/disable ID card generation
                const generateBtn = document.getElementById('generate-id-btn');
                const errorDiv = document.getElementById('id-card-error');
                
                if (collegeInfo.name && studentData.photoURL) {
                    generateBtn.disabled = false;
                    errorDiv.style.display = 'none';
                } else {
                    generateBtn.disabled = true;
                    let errorMsg = '';
                    if (!collegeInfo.name) errorMsg += 'College information not set by admin. ';
                    if (!studentData.photoURL) errorMsg += 'Please upload your photo first. ';
                    errorDiv.textContent = errorMsg + 'Please contact your administrator if needed.';
                    errorDiv.style.display = 'block';
                }
            }
        }
    } catch (error) {
        console.error('Failed to load student dashboard:', error);
    }
}

// Photo upload functionality
function uploadPhoto() {
    const photoURL = document.getElementById('student-photo-url').value;
    const fileInput = document.getElementById('photo-input');
    const file = fileInput.files[0];
    
    if (!photoURL && !file) {
        alert('Please provide a photo URL or select a file');
        return;
    }
    
    const uploadBtn = document.getElementById('upload-photo-btn');
    uploadBtn.textContent = 'Uploading...';
    uploadBtn.disabled = true;
    
    if (photoURL) {
        // Use URL directly
        database.ref(`students/${currentUser.uid}/photoURL`).set(photoURL)
            .then(() => {
                alert('Photo URL saved successfully!');
                loadStudentDashboard();
            })
            .catch((error) => {
                console.error('Failed to save photo URL:', error);
                alert('Failed to save photo URL: ' + error.message);
            })
            .finally(() => {
                uploadBtn.textContent = 'Upload Photo';
                uploadBtn.disabled = false;
            });
    } else if (file) {
        // Upload file
        if (file.size > 1024 * 1024) { // 1MB limit
            alert('File size should be less than 1MB');
            uploadBtn.textContent = 'Upload Photo';
            uploadBtn.disabled = false;
            return;
        }
        
        const progressBar = document.getElementById('upload-progress');
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        
        progressBar.style.display = 'block';
        
        fastUpload(
            file,
            `student-photos/${currentUser.uid}/${Date.now()}_${file.name}`,
            (progress) => {
                progressFill.style.width = `${progress}%`;
                progressText.textContent = `${Math.round(progress)}%`;
            }
        ).then(async (downloadURL) => {
            await database.ref(`students/${currentUser.uid}/photoURL`).set(downloadURL);
            alert('Photo uploaded successfully!');
            await loadStudentDashboard();
        }).catch((error) => {
            console.error('Upload failed:', error);
            alert('Upload failed: ' + error.message);
        }).finally(() => {
            progressBar.style.display = 'none';
            uploadBtn.textContent = 'Upload Photo';
            uploadBtn.disabled = false;
        });
    }
}

// Generate ID Card for current student
async function generateIDCard() {
    try {
        await generateStudentIDCard(currentUser.uid);
    } catch (error) {
        console.error('Failed to generate ID card:', error);
        alert('Failed to generate ID card: ' + error.message);
    }
}

// Generic function to generate ID card for any student
async function generateStudentIDCard(studentUid) {
    try {
        showLoading();
        
        const studentSnapshot = await database.ref(`students/${studentUid}`).once('value');
        if (!studentSnapshot.exists()) {
            throw new Error('Student data not found');
        }
        
        const studentData = studentSnapshot.val();
        
        if (!studentData.admin) {
            throw new Error('Student admin reference not found');
        }
        
        // Fetch college information from admins collection
        const collegeSnapshot = await database.ref(`admins/${studentData.admin}`).once('value');
        if (!collegeSnapshot.exists()) {
            throw new Error('College information not found');
        }
        
        const collegeInfo = collegeSnapshot.val();
        
        if (!collegeInfo.name) {
            throw new Error('College name not set by admin');
        }
        
        // Populate ID card with data
        document.getElementById('college-name-card').textContent = collegeInfo.name;
        document.getElementById('college-address-card').textContent = collegeInfo.address || 'Address not provided';
        document.getElementById('student-name-card').textContent = studentData.name;
        document.getElementById('student-id-card').textContent = studentData.roll;
        document.getElementById('student-year-card').textContent = studentData.graduationYear || 'Not specified';
        document.getElementById('student-blood-card').textContent = studentData.bloodGroup || 'Not specified';
        document.getElementById('issue-date-card').textContent = new Date().toLocaleDateString();
        document.getElementById('student-address-card').textContent = studentData.address || 'Not specified';
        
        // Handle logo
        const logoImg = document.getElementById('college-logo-card');
        const logoPlaceholder = document.getElementById('logo-placeholder-card');
        if (collegeInfo.logo) {
            logoImg.src = collegeInfo.logo;
            logoImg.style.display = 'block';
            logoPlaceholder.style.display = 'none';
        } else {
            logoImg.style.display = 'none';
            logoPlaceholder.style.display = 'flex';
        }
        
        // Handle student photo
        const studentPhoto = document.getElementById('student-photo-card');
        const photoPlaceholder = document.getElementById('photo-placeholder-card');
        if (studentData.photoURL) {
            studentPhoto.src = studentData.photoURL;
            studentPhoto.style.display = 'block';
            photoPlaceholder.style.display = 'none';
        } else {
            studentPhoto.style.display = 'none';
            photoPlaceholder.style.display = 'flex';
        }
        
        // Generate barcode pattern
        const barcode = document.getElementById('barcode-card');
        const studentId = studentData.roll;
        if (studentId) {
            let pattern = '';
            const chars = studentId.toString();
            
            for (let i = 0; i < chars.length; i++) {
                const charCode = chars.charCodeAt(i);
                const width = (charCode % 4) + 1;
                pattern += `#000 ${i * 8}px, #000 ${i * 8 + width}px, #fff ${i * 8 + width}px, #fff ${i * 8 + width + 2}px, `;
            }
            
            pattern = pattern.slice(0, -2);
            barcode.style.background = `repeating-linear-gradient(90deg, ${pattern})`;
        }
        
        hideLoading();
        showPage('id-card-view');
    } catch (error) {
        console.error('Failed to generate ID card:', error);
        hideLoading();
        throw error;
    }
}

// Go back from ID card view
function goBackFromIDCard() {
    if (userType === 'admin') {
        showPage('admin-dashboard');
        showTab('id-generation');
    } else {
        showPage('student-dashboard');
    }
}

// Print ID Card (Single Page PDF)
function printIDCard() {
    window.print();
}

// Photo modal functions
function showPhotoModal(photoURL) {
    const modal = document.getElementById('photo-modal');
    const modalPhoto = document.getElementById('modal-photo');
    modalPhoto.src = photoURL;
    modal.style.display = 'flex';
}

function closePhotoModal() {
    const modal = document.getElementById('photo-modal');
    modal.style.display = 'none';
}

// Close modal when clicking outside
document.getElementById('photo-modal').addEventListener('click', function(e) {
    if (e.target === this) {
        closePhotoModal();
    }
});

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    showLoading();
    
    auth.onAuthStateChanged((user) => {
        if (!user) {
            hideLoading();
        }
    });
});
