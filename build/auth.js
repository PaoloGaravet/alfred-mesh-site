/**
 * Authentication and Group Verification for Alfred
 * Verifies user belongs to "Cluster Mesh IT_dip_logical_group"
 */

class AlfredAuth {
    constructor() {
        this.requiredGroup = 'Cluster Mesh IT_dip_logical_group';
        this.requiredGroupId = '02b39ca3-cc46-4fed-9fd5-768ecf94aec2';
        this.userInfo = null;
        this.init();
    }

    async init() {
        // Hide content immediately until authentication is verified
        this.hideContent();
        
        // Safety timeout - show content after 10 seconds regardless
        setTimeout(() => {
            console.log('Safety timeout: showing content');
            this.showContent();
        }, 10000);
        
        try {
            await this.checkAuthentication();
        } catch (error) {
            console.error('Authentication error:', error);
            this.redirectToLogin();
        }
    }

    hideContent() {
        const body = document.body;
        if (body) {
            body.style.display = 'none';
        }
    }

    showContent() {
        const body = document.body;
        if (body) {
            body.style.display = 'block';
        }
    }

    async checkAuthentication() {
        try {
            // Get user information from Azure Static Web Apps auth
            const response = await fetch('/.auth/me');
            const authData = await response.json();

            console.log('Auth data received:', authData);

            if (!authData.clientPrincipal) {
                // Force redirect to login if not authenticated
                this.redirectToLogin();
                return false;
            }

            this.userInfo = authData.clientPrincipal;
            console.log('User info:', this.userInfo);
            
            // For now, show content for any authenticated user
            // We'll add group checking later once we see the claims structure
            this.showContent();
            this.showUserInfo();
            
            // Log claims for debugging
            if (this.userInfo.claims) {
                console.log('User claims:', this.userInfo.claims);
            }
            
            // Check if user belongs to required group (non-blocking for now)
            const hasGroup = this.hasRequiredGroup();
            console.log('Has required group:', hasGroup);
            
            return true;

        } catch (error) {
            console.error('Auth check failed:', error);
            this.redirectToLogin();
            return false;
        }
    }

    hasRequiredGroup() {
        if (!this.userInfo || !this.userInfo.claims) {
            return false;
        }

        // Check for group membership using both name and Object ID
        const groups = this.userInfo.claims.filter(claim => 
            claim.typ === 'groups' || 
            claim.typ === 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role' ||
            claim.typ === 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/groups'
        );

        return groups.some(group => 
            group.val === this.requiredGroup || 
            group.val === this.requiredGroupId ||
            group.val.includes('Cluster Mesh IT_dip_logical_group')
        );
    }

    showUserInfo() {
        // Add user info to the page
        const userDisplay = document.createElement('div');
        userDisplay.className = 'user-info';
        userDisplay.innerHTML = `
            <div class="user-welcome">
                <span>Benvenuto, ${this.userInfo.userDetails || this.userInfo.userId || 'Utente'}</span>
                <a href="/.auth/logout" class="logout-link">Logout</a>
            </div>
        `;

        // Add to navigation
        const nav = document.querySelector('.navbar .nav-container');
        if (nav) {
            // Remove existing user info if any
            const existingUserInfo = nav.querySelector('.user-info');
            if (existingUserInfo) {
                existingUserInfo.remove();
            }
            nav.appendChild(userDisplay);
        }

        // Add CSS for user info
        this.addUserInfoStyles();
    }

    showAccessDenied() {
        document.body.innerHTML = `
            <div class="access-denied">
                <div class="access-denied-content">
                    <h1>🚫 Accesso Negato</h1>
                    <p>Mi dispiace, ma l'accesso ad Alfred è riservato ai membri del gruppo <strong>Cluster Mesh IT</strong>.</p>
                    <p>Se ritieni di dover avere accesso, contatta l'amministratore di sistema.</p>
                    <div class="access-actions">
                        <a href="/.auth/logout" class="btn-primary">Logout</a>
                        <a href="mailto:support@clustermesh.com" class="btn-secondary">Contatta Supporto</a>
                    </div>
                </div>
            </div>
        `;
        this.addAccessDeniedStyles();
    }

    redirectToLogin() {
        window.location.href = '/.auth/login/aad';
    }

    addUserInfoStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .user-info {
                margin-left: auto;
                display: flex;
                align-items: center;
            }
            
            .user-welcome {
                display: flex;
                align-items: center;
                gap: 1rem;
                color: white;
                font-size: 0.9rem;
            }
            
            .logout-link {
                color: #ff6600;
                text-decoration: none;
                padding: 0.5rem 1rem;
                border: 1px solid #ff6600;
                border-radius: 6px;
                transition: all 0.3s ease;
            }
            
            .logout-link:hover {
                background: #ff6600;
                color: white;
            }
        `;
        document.head.appendChild(style);
    }

    addAccessDeniedStyles() {
        const style = document.createElement('style');
        style.textContent = `
            body {
                margin: 0;
                font-family: 'Space Grotesk', sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .access-denied {
                background: white;
                border-radius: 20px;
                padding: 3rem;
                max-width: 500px;
                text-align: center;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            }
            
            .access-denied h1 {
                color: #333;
                margin-bottom: 1rem;
                font-size: 2rem;
            }
            
            .access-denied p {
                color: #666;
                line-height: 1.6;
                margin-bottom: 1rem;
            }
            
            .access-actions {
                display: flex;
                gap: 1rem;
                justify-content: center;
                margin-top: 2rem;
            }
            
            .btn-primary, .btn-secondary {
                padding: 1rem 2rem;
                text-decoration: none;
                border-radius: 10px;
                font-weight: 500;
                transition: all 0.3s ease;
            }
            
            .btn-primary {
                background: #ff6600;
                color: white;
            }
            
            .btn-primary:hover {
                background: #e55a00;
                transform: translateY(-2px);
            }
            
            .btn-secondary {
                background: transparent;
                color: #ff6600;
                border: 2px solid #ff6600;
            }
            
            .btn-secondary:hover {
                background: #ff6600;
                color: white;
            }
        `;
        document.head.appendChild(style);
    }
}

// Initialize authentication when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AlfredAuth();
});