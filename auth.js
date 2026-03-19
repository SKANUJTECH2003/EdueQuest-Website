/**
 * EduQuest Authentication & API Helper
 * Provides JWT-based authentication and API utilities for frontend
 */

const AUTH_TOKEN_KEY = 'eduquest_token';
const USER_NAME_KEY = 'eduquest_user_name';
const USER_EMAIL_KEY = 'eduquest_user_email';
const USER_POINTS_KEY = 'eduquest_user_points';
const USER_ID_KEY = 'eduquest_user_id';
const USER_ROLE_KEY = 'eduquest_user_role';

// Get API base URL
const getAPIBase = () => {
    // Use relative paths for both local and production
    return '';  // Empty string means current origin
};

/**
 * Get the stored JWT token
 */
function getAuthToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
}

/**
 * Check if user is authenticated
 */
function isAuthenticated() {
    return !!getAuthToken();
}

/**
 * Get current user info
 */
function getCurrentUser() {
    return {
        name: localStorage.getItem(USER_NAME_KEY),
        email: localStorage.getItem(USER_EMAIL_KEY),
        points: parseInt(localStorage.getItem(USER_POINTS_KEY)) || 0,
        id: localStorage.getItem(USER_ID_KEY),
        role: localStorage.getItem(USER_ROLE_KEY) || 'user'
    };
}

/**
 * Make authenticated API request
 */
async function apiRequest(endpoint, options = {}) {
    const token = getAuthToken();
    const defaultHeaders = {
        'Content-Type': 'application/json'
    };

    if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers
        }
    };

    try {
        const response = await fetch(`${getAPIBase()}${endpoint}`, config);
        
        if (response.status === 401) {
            // Token expired or invalid, redirect to login
            logout();
            throw new Error('Session expired. Please log in again.');
        }

        if (response.status === 403) {
            throw new Error('Access denied. Admin privileges required.');
        }

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'API request failed');
        }

        return await response.json();
    } catch (error) {
        console.error(`API Error [${endpoint}]:`, error);
        throw error;
    }
}

/**
 * Update user score
 */
async function updateScore(email, points, subject = '') {
    try {
        const response = await apiRequest('/api/update-score', {
            method: 'POST',
            body: JSON.stringify({ email, points, subject })
        });
        
        // Update local score
        const currentScore = parseInt(localStorage.getItem(USER_POINTS_KEY)) || 0;
        localStorage.setItem(USER_POINTS_KEY, currentScore + points);
        
        return response;
    } catch (error) {
        console.error('Error updating score:', error);
        throw error;
    }
}

/**
 * Fetch leaderboard
 */
async function getLeaderboard(subject = 'all') {
    try {
        return await apiRequest(`/api/leaderboard?subject=${subject}`);
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        throw error;
    }
}

/**
 * Fetch user data
 */
async function getUserData() {
    try {
        const user = getCurrentUser();
        if (!user.email) {
            throw new Error('User not authenticated');
        }
        
        const response = await apiRequest(`/api/user-data?email=${user.email}`);
        
        // Update local storage with latest user data
        localStorage.setItem(USER_POINTS_KEY, response.user.points);
        
        return response.user;
    } catch (error) {
        console.error('Error fetching user data:', error);
        throw error;
    }
}

/**
 * Redeem a product
 */
async function redeemProduct(productName, cost, deliveryInfo) {
    try {
        const user = getCurrentUser();
        const response = await apiRequest('/api/redeem-product', {
            method: 'POST',
            body: JSON.stringify({
                email: user.email,
                productName,
                cost,
                deliveryInfo
            })
        });

        // Update local score
        localStorage.setItem(USER_POINTS_KEY, response.newScore);
        
        return response;
    } catch (error) {
        console.error('Error redeeming product:', error);
        throw error;
    }
}

/**
 * Get notifications
 */
async function getNotifications() {
    try {
        return await apiRequest('/api/notifications');
    } catch (error) {
        console.error('Error fetching notifications:', error);
        throw error;
    }
}

/**
 * Mark notification as read
 */
async function markNotificationAsRead(notificationId) {
    try {
        return await apiRequest(`/api/notifications/${notificationId}/read`, {
            method: 'POST'
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        throw error;
    }
}

/**
 * Get suggested next quiz based on performance
 */
async function suggestNextQuiz(score, totalQuestions, subject) {
    try {
        return await apiRequest('/api/quiz/suggest-next', {
            method: 'POST',
            body: JSON.stringify({ score, totalQuestions, subject })
        });
    } catch (error) {
        console.error('Error getting quiz suggestion:', error);
        throw error;
    }
}

/**
 * Save custom note
 */
async function saveNote(classId, subjectId, title, desc, filePath) {
    try {
        return await apiRequest('/api/save-note', {
            method: 'POST',
            body: JSON.stringify({ classId, subjectId, title, desc, filePath })
        });
    } catch (error) {
        console.error('Error saving note:', error);
        throw error;
    }
}

/**
 * Get user's notes
 */
async function getUserNotes(classId, subjectId) {
    try {
        return await apiRequest(`/api/user-notes?classId=${classId}&subjectId=${subjectId}`);
    } catch (error) {
        console.error('Error fetching notes:', error);
        throw error;
    }
}

/**
 * Delete a note
 */
async function deleteNote(classId, subjectId, noteId) {
    try {
        return await apiRequest('/api/delete-note', {
            method: 'POST',
            body: JSON.stringify({ classId, subjectId, noteId })
        });
    } catch (error) {
        console.error('Error deleting note:', error);
        throw error;
    }
}

/**
 * Logout user
 */
function logout() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_NAME_KEY);
    localStorage.removeItem(USER_EMAIL_KEY);
    localStorage.removeItem(USER_POINTS_KEY);
    localStorage.removeItem(USER_ID_KEY);
    localStorage.removeItem(USER_ROLE_KEY);
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('totalScore');
    window.location.href = '/login.html';
}

/**
 * Ensure user is authenticated, redirect if not
 */
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

/**
 * Ensure user is admin
 */
function requireAdmin() {
    const user = getCurrentUser();
    if (user.role !== 'admin') {
        alert('Admin access required');
        window.location.href = '/dashboard.html';
        return false;
    }
    return true;
}

// Auto-logout on page load if token is missing (for security)
window.addEventListener('load', () => {
    const token = getAuthToken();
    const publicPages = ['/login.html', '/index.html', '/'];
    const currentPage = window.location.pathname;
    
    const isPublicPage = publicPages.some(page => currentPage.includes(page));
    
    if (!token && !isPublicPage) {
        // Redirect to login if on protected page and no token
        if (!currentPage.includes('login')) {
            window.location.href = '/login.html';
        }
    }
});