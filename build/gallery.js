/**
 * Gallery Events - Gestione della gallery fotografica eventi Cluster Mesh
 * Integrazione con Dataverse per eventi e SharePoint per immagini
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
    }

    async waitForAuth() {
        // Aspetta che l'auth sia completata (massimo 10 secondi)
        let attempts = 0;
        while (!window.userAuthenticated && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 200));
            attempts++;
        }
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
            // Simula chiamata a Dataverse tramite Azure Function
            // In produzione, questa chiamata andrà al tuo endpoint Azure Function
            const response = await this.callDataverseAPI('/api/events');
            
            if (response.ok) {
                this.events = await response.json();
                this.displayEvents();
            } else {
                throw new Error('Errore nel caricamento eventi');
            }
            
        } catch (error) {
            console.error('Errore caricamento eventi:', error);
            this.showEventsError();
        }
    }

    async callDataverseAPI(endpoint) {
        try {
            // Chiamata reale all'Azure Function che si connette a Dataverse
            const response = await fetch(`/api${endpoint}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return {
                ok: true,
                json: () => Promise.resolve(data)
            };
            
        } catch (error) {
            console.error('Errore chiamata Dataverse API:', error);
            throw error;
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
            // Simula chiamata a SharePoint tramite Azure Function
            const response = await this.callSharePointAPI(event.galleryUrl);
            
            if (response.ok) {
                this.currentImages = await response.json();
                this.displayGallery();
            } else {
                throw new Error('Errore nel caricamento immagini');
            }
            
        } catch (error) {
            console.error('Errore caricamento immagini:', error);
            this.showGalleryError();
        }
    }

    async callSharePointAPI(galleryUrl) {
        try {
            // Chiamata reale all'Azure Function che recupera le immagini da SharePoint
            const response = await fetch(`/api/events/${this.currentEvent.id}/images?galleryUrl=${encodeURIComponent(galleryUrl)}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return {
                ok: true,
                json: () => Promise.resolve(data)
            };
            
        } catch (error) {
            console.error('Errore chiamata SharePoint API:', error);
            throw error;
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