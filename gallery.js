/**
 * Gallery Events - Gestione della gallery fotografica eventi Cluster Mesh
 * Integrazione con Blob Storage per eventi e immagini
 */

class GalleryManager {
    constructor() {
        this.events = [];
        this.currentEvent = null;
        this.currentImages = [];
        this.currentImageIndex = 0;
        this.isLoading = false;
        this.init();
    }
    
    async init() {
        // Aspetta che l'autenticazione sia completata
        await this.waitForAuth();
        
        // Carica la lista degli eventi
        await this.loadEvents();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Check for deep linking parameter
        this.checkDeepLink();
    }
    
    checkDeepLink() {
        const urlParams = new URLSearchParams(window.location.search);
        const eventId = urlParams.get('event');
        
        if (eventId && this.events.length > 0) {
            // Cerca l'evento con l'ID specificato
            const event = this.events.find(e => e.id === eventId);
            if (event) {
                console.log('Deep link detected, opening event:', eventId);
                this.selectEvent(event);
            } else {
                console.warn('Event not found for deep link:', eventId);
            }
        }
    }

    async waitForAuth() {
        let attempts = 0;
        while (attempts < 20) {
            try {
                const response = await fetch('/.auth/me', { cache: 'no-store' });
                const authData = await response.json();
                if (authData?.clientPrincipal) {
                    console.log('waitForAuth: utente autenticato', authData.clientPrincipal.userDetails);
                    window.userAuthenticated = true;
                    this.userPrincipal = authData.clientPrincipal;
                    return;
                }
            } catch (error) {
                console.warn('waitForAuth: errore nel recupero auth', error);
            }
            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
        }
        console.warn('waitForAuth: impossibile determinare stato autenticazione');
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('eventSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterEvents(e.target.value);
            });
        }

        // Keyboard navigation per lightbox
        document.addEventListener('keydown', (e) => {
            if (document.getElementById('lightbox').style.display !== 'none') {
                if (e.key === 'Escape') {
                    this.closeLightbox();
                } else if (e.key === 'ArrowLeft') {
                    this.previousImage();
                } else if (e.key === 'ArrowRight') {
                    this.nextImage();
                }
            }
        });
    }

    async loadEvents() {
        this.showEventsLoading();
        
        try {
            // Carica eventi da Blob Storage
            const response = await fetch('/api/blob-events');
            
            if (response.ok) {
                this.events = await response.json();
                console.log('✅ Eventi caricati da Blob Storage:', this.events.length);
                this.displayEvents();
            } else {
                throw new Error('Errore nel caricamento eventi');
            }
            
        } catch (error) {
            console.error('Errore caricamento eventi:', error);
            this.showEventsError();
        }
    }

    showEventsLoading() {
        document.getElementById('eventsLoading').style.display = 'block';
        document.getElementById('eventsGrid').style.display = 'none';
        document.getElementById('eventsError').style.display = 'none';
    }

    showEventsError() {
        document.getElementById('eventsLoading').style.display = 'none';
        document.getElementById('eventsGrid').style.display = 'none';
        document.getElementById('eventsError').style.display = 'block';
    }

    displayEvents() {
        document.getElementById('eventsLoading').style.display = 'none';
        document.getElementById('eventsError').style.display = 'none';
        
        const grid = document.getElementById('eventsGrid');
        grid.innerHTML = '';
        
        this.events.forEach(event => {
            const eventCard = this.createEventCard(event);
            grid.appendChild(eventCard);
        });
        
        grid.style.display = 'grid';
    }

    createEventCard(event) {
        const card = document.createElement('div');
        card.className = 'event-card';
        card.onclick = () => this.selectEvent(event);
        
        const eventDate = new Date(event.date).toLocaleDateString('it-IT', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        
        const typeIcons = {
            'Team Building': '🏃‍♂️',
            'Workshop': '🎓',
            'Festa': '🎉',
            'Conferenza': '🎤',
            'Networking': '🤝',
            'default': '📅'
        };
        
        card.innerHTML = `
            <div class="event-card-header">
                <div class="event-icon">${typeIcons[event.type] || typeIcons.default}</div>
                <div class="event-meta">
                    <h3 class="event-title">${event.name}</h3>
                    <p class="event-date">${eventDate}</p>
                </div>
            </div>
            <p class="event-description">${event.description}</p>
            <div class="event-stats">
                <div class="event-stat">
                    <span>📸</span>
                    <span>${event.imageCount} foto</span>
                </div>
                <div class="event-stat">
                    <span>🏷️</span>
                    <span>${event.type}</span>
                </div>
            </div>
        `;
        
        return card;
    }

    filterEvents(searchTerm) {
        const cards = document.querySelectorAll('.event-card');
        const term = searchTerm.toLowerCase();
        
        cards.forEach(card => {
            const title = card.querySelector('.event-title').textContent.toLowerCase();
            const description = card.querySelector('.event-description').textContent.toLowerCase();
            const type = card.querySelector('.event-stat:last-child span:last-child').textContent.toLowerCase();
            
            const matches = title.includes(term) || description.includes(term) || type.includes(term);
            card.style.display = matches ? 'block' : 'none';
        });
    }

    async selectEvent(event) {
        this.currentEvent = event;
        
        // Nascondi selector e mostra gallery
        document.querySelector('.event-selector').style.display = 'none';
        document.getElementById('galleryViewer').style.display = 'block';
        
        // Aggiorna info evento
        document.getElementById('selectedEventName').textContent = event.name;
        document.getElementById('selectedEventDate').textContent = new Date(event.date).toLocaleDateString('it-IT', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        
        // Carica immagini
        await this.loadEventImages(event);
    }

    async loadEventImages(event) {
        document.getElementById('galleryLoading').style.display = 'block';
        document.getElementById('galleryGrid').innerHTML = '';
        document.getElementById('galleryError').style.display = 'none';
        
        try {
            // Carica immagini da Blob Storage
            const response = await fetch(`/api/blob-images?folder=${encodeURIComponent(event.folder)}`);
            
            if (response.ok) {
                this.currentImages = await response.json();
                console.log('✅ Immagini caricate:', this.currentImages.length);
                this.displayGallery();
            } else {
                throw new Error('Errore nel caricamento immagini');
            }
            
        } catch (error) {
            console.error('Errore caricamento immagini:', error);
            this.showGalleryError();
        }
    }

    displayGallery() {
        document.getElementById('galleryLoading').style.display = 'none';
        
        const grid = document.getElementById('galleryGrid');
        grid.innerHTML = '';
        
        this.currentImages.forEach((image, index) => {
            const item = this.createGalleryItem(image, index);
            grid.appendChild(item);
        });
    }

    createGalleryItem(image, index) {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.onclick = () => this.openLightbox(index);
        
        item.innerHTML = `
            <img src="${image.thumbnail}" alt="${image.caption}" loading="lazy">
            <div class="gallery-overlay">
                <span>🔍</span>
            </div>
        `;
        
        return item;
    }

    showGalleryError() {
        document.getElementById('galleryLoading').style.display = 'none';
        document.getElementById('galleryError').style.display = 'block';
    }

    showEventSelector() {
        document.querySelector('.event-selector').style.display = 'block';
        document.getElementById('galleryViewer').style.display = 'none';
        this.currentEvent = null;
        this.currentImages = [];
    }

    openLightbox(index) {
        this.currentImageIndex = index;
        const image = this.currentImages[index];
        
        document.getElementById('lightboxImage').src = image.url;
        document.getElementById('lightboxCaption').textContent = image.caption;
        document.getElementById('lightboxCounter').textContent = `${index + 1} di ${this.currentImages.length}`;
        
        document.getElementById('lightbox').style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    closeLightbox() {
        document.getElementById('lightbox').style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    previousImage() {
        if (this.currentImageIndex > 0) {
            this.openLightbox(this.currentImageIndex - 1);
        }
    }

    nextImage() {
        if (this.currentImageIndex < this.currentImages.length - 1) {
            this.openLightbox(this.currentImageIndex + 1);
        }
    }
}

// Funzioni globali per compatibilità con HTML
function showEventSelector() {
    window.galleryManager.showEventSelector();
}

function loadEvents() {
    window.galleryManager.loadEvents();
}

function closeLightbox() {
    window.galleryManager.closeLightbox();
}

function previousImage() {
    window.galleryManager.previousImage();
}

function nextImage() {
    window.galleryManager.nextImage();
}

// Inizializza quando DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    window.galleryManager = new GalleryManager();
});
