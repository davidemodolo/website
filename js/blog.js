// Blog functionality for the portfolio website

let blogActive = false;
let allArticles = [];
let filteredArticles = [];
let activeFilters = {
    topics: [],
    tags: [],
    search: ''
};
let savedWindowStates = null;

// Initialize blog functionality
document.addEventListener('DOMContentLoaded', function() {
    loadArticles();
    handleInitialURL();
    
    // Handle browser back/forward buttons
    window.addEventListener('popstate', handleURLChange);
});

// Toggle between portfolio and blog view
function toggleBlogView() {
    const blogView = document.getElementById('blog-view');
    const desktop = document.querySelector('.desktop');
    const body = document.body;
    const blogToggle = document.getElementById('taskbar-blog');
    
    blogActive = !blogActive;
    
    if (blogActive) {
        // Switch to blog view - add small delay to ensure any window animations complete
        setTimeout(() => {
            saveCurrentWindowStates();
            
            // Clear inline styles that might interfere with CSS transitions
            const windows = document.querySelectorAll('.window');
            windows.forEach(window => {
                if (window.classList.contains('positioned') && !window.classList.contains('hidden')) {
                    // Clear ALL inline styles that might interfere with CSS transitions
                    window.style.opacity = '';
                    window.style.transform = '';
                    window.style.transition = '';
                }
            });
            
            // Start transition to blog view
            blogView.classList.remove('hidden');
            blogView.classList.add('active');
            body.classList.add('blog-active');
            blogToggle.textContent = '🏠 Portfolio';
            
            // Load and display articles after animation
            setTimeout(() => {
                displayArticles();
                setupFilters();
            }, 300);
        }, 100);
        
    } else {
        // Switch back to portfolio view
        blogView.classList.remove('active');
        blogView.classList.add('hidden');
        body.classList.remove('blog-active');
        blogToggle.textContent = '📝 Blog';
        
        // Restore the exact state from before entering blog after animation
        setTimeout(() => {
            restoreWindowStates();
            
            // Hide article reader if open
            closeBlogArticle();
        }, 600);
    }
}

// Save current window states before entering blog view
function saveCurrentWindowStates() {
    if (!windowManager) return;
    
    savedWindowStates = {
        windowStates: JSON.parse(JSON.stringify(windowManager.windowStates)),
        windowPositions: {},
        taskbarStates: {}
    };
    
    // Save current window positions and styles
    const windows = document.querySelectorAll('.window');
    windows.forEach(window => {
        const windowId = window.id;
        
        // For positioned windows, ensure we save the final state, not animation state
        const computedStyle = window.getComputedStyle ? getComputedStyle(window) : {};
        const isPositioned = window.classList.contains('positioned');
        
        savedWindowStates.windowPositions[windowId] = {
            hidden: window.classList.contains('hidden'),
            minimized: window.classList.contains('minimized'),
            maximized: window.classList.contains('fullscreen'),
            active: window.classList.contains('active'),
            positioned: isPositioned,
            style: {
                position: window.style.position,
                left: window.style.left,
                top: window.style.top,
                width: window.style.width,
                height: window.style.height,
                // For positioned windows, ensure final opacity and transform
                opacity: isPositioned ? '1' : window.style.opacity,
                transform: isPositioned ? 'translateY(0)' : window.style.transform,
                transition: window.style.transition
            }
        };
    });
    
    // Save taskbar states
    const taskbarItems = document.querySelectorAll('.taskbar-item:not(.blog-toggle)');
    taskbarItems.forEach(item => {
        if (!item.classList.contains('status-indicator')) {
            const windowId = item.id.replace('taskbar-', '') + '-window';
            savedWindowStates.taskbarStates[item.id] = {
                hidden: item.classList.contains('hidden')
            };
        }
    });
}

// Restore the exact window states from before entering blog view
function restoreWindowStates() {
    if (!savedWindowStates || !windowManager) return;
    
    // Temporarily disable transitions on all windows to prevent flashing
    const windows = document.querySelectorAll('.window');
    windows.forEach(window => {
        window.style.transition = 'none';
    });
    
    // Restore window manager internal states
    windowManager.windowStates = savedWindowStates.windowStates;
    
    // Restore window DOM states and styles immediately
    windows.forEach(window => {
        const windowId = window.id;
        const savedState = savedWindowStates.windowPositions[windowId];
        
        if (savedState) {
            // Remove all classes first
            window.classList.remove('hidden', 'minimized', 'fullscreen', 'active', 'positioned');
            
            // Restore all styles immediately
            Object.assign(window.style, savedState.style);
            
            // Restore all classes immediately
            if (savedState.hidden) window.classList.add('hidden');
            if (savedState.minimized) window.classList.add('minimized');
            if (savedState.maximized) window.classList.add('fullscreen');
            if (savedState.active) window.classList.add('active');
            if (savedState.positioned) window.classList.add('positioned');
        }
    });
    
    // Re-enable transitions after a short delay to allow smooth future interactions
    setTimeout(() => {
        windows.forEach(window => {
            window.style.transition = 'opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1), visibility 0.5s ease, transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
        });
    }, 100);
    
    // Restore taskbar states
    const taskbarItems = document.querySelectorAll('.taskbar-item:not(.blog-toggle)');
    taskbarItems.forEach(item => {
        if (!item.classList.contains('status-indicator')) {
            const savedTaskbarState = savedWindowStates.taskbarStates[item.id];
            if (savedTaskbarState) {
                if (savedTaskbarState.hidden) {
                    item.classList.add('hidden');
                } else {
                    item.classList.remove('hidden');
                }
            }
        }
    });
}

// Reset to fresh portfolio view

// Load articles from JSON file
async function loadArticles() {
    try {
        const response = await fetch('blog/articles.json');
        const data = await response.json();
        allArticles = data.articles.sort((a, b) => new Date(b.date) - new Date(a.date));
        filteredArticles = [...allArticles];
    } catch (error) {
        console.error('Error loading articles:', error);
        allArticles = [];
        filteredArticles = [];
    }
}

// Display articles in the simplified layout
function displayArticles() {
    const container = document.getElementById('articles-container');
    
    if (filteredArticles.length === 0) {
        container.innerHTML = '<div class="no-articles">No articles found matching your criteria.</div>';
        return;
    }
    
    container.innerHTML = filteredArticles.map(article => `
        <div class="article-card" onclick="openBlogArticle('${article.id}')">
            <h3 class="article-title">${article.title}</h3>
            <p class="article-excerpt">${article.excerpt}</p>
            <div class="article-meta">
                <span class="article-date">${formatDate(article.date)}</span>
                <span class="article-topic">${article.topic}</span>
                <div class="article-tags">
                    ${article.tags.map(tag => `<span class="article-tag">${tag}</span>`).join('')}
                </div>
            </div>
        </div>
    `).join('');
}

// Setup simplified filter interface
function setupFilters() {
    const allTopics = [...new Set(allArticles.map(article => article.topic))];
    const allTags = [...new Set(allArticles.flatMap(article => article.tags))];
    
    // Get most popular tags
    const tagCounts = {};
    allTags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
    
    const popularTags = Object.entries(tagCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([tag]) => tag);
    
    // Populate topic filters
    const topicFiltersContainer = document.getElementById('topic-filters');
    topicFiltersContainer.innerHTML = allTopics.map(topic => `
        <span class="filter-tag" data-type="topic" data-value="${topic}" onclick="toggleFilter('topic', '${topic}')">
            ${topic}
        </span>
    `).join('');
    
    // Populate tag filters
    const tagFiltersContainer = document.getElementById('tag-filters');
    tagFiltersContainer.innerHTML = popularTags.map(tag => `
        <span class="filter-tag" data-type="tag" data-value="${tag}" onclick="toggleFilter('tag', '${tag}')">
            ${tag}
        </span>
    `).join('');
    
    // Setup search input
    const searchInput = document.getElementById('blog-search-input');
    searchInput.addEventListener('input', (e) => {
        activeFilters.search = e.target.value.toLowerCase();
        applyFilters();
    });
    
    // Allow search on Enter key
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchArticles();
        }
    });
}

// Toggle filter selection
function toggleFilter(type, value) {
    const filterElement = document.querySelector(`[data-type="${type}"][data-value="${value}"]`);
    
    if (activeFilters[type + 's'].includes(value)) {
        // Remove filter
        activeFilters[type + 's'] = activeFilters[type + 's'].filter(item => item !== value);
        filterElement.classList.remove('active');
    } else {
        // Add filter
        activeFilters[type + 's'].push(value);
        filterElement.classList.add('active');
    }
    
    applyFilters();
}

// Apply all active filters
function applyFilters() {
    filteredArticles = allArticles.filter(article => {
        // Topic filter
        if (activeFilters.topics.length > 0 && !activeFilters.topics.includes(article.topic)) {
            return false;
        }
        
        // Tag filter
        if (activeFilters.tags.length > 0 && !activeFilters.tags.some(tag => article.tags.includes(tag))) {
            return false;
        }
        
        // Search filter
        if (activeFilters.search) {
            const searchTerm = activeFilters.search;
            const searchableText = (
                article.title + ' ' + 
                article.excerpt + ' ' + 
                article.tags.join(' ') + ' ' + 
                article.topic
            ).toLowerCase();
            
            if (!searchableText.includes(searchTerm)) {
                return false;
            }
        }
        
        return true;
    });
    
    displayArticles();
    updateFilterCount();
}

// Update filter count display
function updateFilterCount() {
    const totalFilters = activeFilters.topics.length + activeFilters.tags.length + (activeFilters.search ? 1 : 0);
    const header = document.getElementById('blog-main-title');
    
    if (totalFilters > 0) {
        header.textContent = `Articles (${filteredArticles.length})`;
    } else {
        header.textContent = 'Articles';
    }
}

// Search function (can be called by search button)
function searchArticles() {
    const searchInput = document.getElementById('blog-search-input');
    activeFilters.search = searchInput.value.toLowerCase();
    applyFilters();
}

// Clear all filters
function clearAllFilters() {
    activeFilters = {
        topics: [],
        tags: [],
        search: ''
    };
    
    // Reset UI
    document.querySelectorAll('.filter-tag.active').forEach(el => el.classList.remove('active'));
    document.getElementById('blog-search-input').value = '';
    
    // Reset articles
    filteredArticles = [...allArticles];
    displayArticles();
    updateFilterCount();
}

// Open and display a blog article
async function openBlogArticle(articleId, updateURL = true) {
    const article = allArticles.find(a => a.id === articleId);
    if (!article) return;
    
    // Update URL if requested
    if (updateURL) {
        const newURL = `${window.location.origin}${window.location.pathname}#blog/${articleId}`;
        history.pushState({ blogArticle: articleId }, `${article.title} - Blog`, newURL);
    }

    try {
        // Show loading state
        const articleContent = document.getElementById('article-content');
        articleContent.innerHTML = '<div class="loading">Loading article...</div>';
        
        // Start slide-out animation for main blog content
        const articlesContainer = document.getElementById('articles-container');
        const blogHeader = document.querySelector('.blog-header');
        const blogFilters = document.getElementById('blog-filters');
        const articleReader = document.getElementById('article-reader');
        
        // Update article reader header with back button and share button only
        const articleHeaderDiv = articleReader.querySelector('.article-header');
        articleHeaderDiv.innerHTML = `
            <button onclick="closeBlogArticle()" class="back-link">← Back to Articles</button>
            <button onclick="copyArticleLink('${articleId}')" class="share-button" title="Copy article link">
                Share
            </button>
        `;
        
        // Slide out the main blog content
        articlesContainer.style.opacity = '0';
        articlesContainer.style.transform = 'translateX(-50%)';
        blogHeader.style.opacity = '0';
        blogHeader.style.transform = 'translateX(-50%)';
        blogFilters.style.opacity = '0';
        blogFilters.style.transform = 'translateX(-50%)';
        
        // After slide-out animation, hide main content and show article reader
        setTimeout(() => {
            articlesContainer.style.display = 'none';
            blogHeader.style.display = 'none';
            blogFilters.style.display = 'none';
            
            // Show article reader and start slide-in animation
            articleReader.classList.remove('hidden');
            
            // Fetch and parse markdown
            loadArticleContent(article);
            
            // Scroll to top
            document.getElementById('blog-view').scrollTop = 0;
        }, 400);
        
    } catch (error) {
        console.error('Error loading article:', error);
        document.getElementById('article-content').innerHTML = 
            '<div class="error">Error loading article. Please try again.</div>';
    }
}// Helper function to load article content
async function loadArticleContent(article) {
    try {
        const response = await fetch(`blog/articles/${article.filename}`);
        const markdown = await response.text();
        
        // Parse markdown to HTML
        const html = parseMarkdown(markdown);
        
        // Display the article
        document.getElementById('article-content').innerHTML = html;
        
        // Handle header anchor scrolling if present in URL
        setTimeout(() => {
            const hash = window.location.hash;
            if (hash && !hash.startsWith('#blog/')) {
                const targetElement = document.getElementById(hash.substring(1));
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth' });
                }
            }
        }, 100);
        
    } catch (error) {
        console.error('Error loading article content:', error);
        document.getElementById('article-content').innerHTML = 
            '<div class="error">Error loading article content. Please try again.</div>';
    }
}

// Close blog article and return to articles list
function closeBlogArticle(updateURL = true) {
    // Update URL to remove article reference
    if (updateURL && window.location.hash.includes('blog/')) {
        const newURL = `${window.location.origin}${window.location.pathname}`;
        history.pushState({ blogView: true }, 'Blog', newURL);
    }
    
    const articlesContainer = document.getElementById('articles-container');
    const blogHeader = document.querySelector('.blog-header');
    const blogFilters = document.getElementById('blog-filters');
    const articleReader = document.getElementById('article-reader');
    
    // Start slide-out animation for article reader
    articleReader.classList.add('hidden');
    
    // After slide-out animation, show main content and start slide-in animation
    setTimeout(() => {
        // Show main blog content
        articlesContainer.style.display = 'flex';
        blogHeader.style.display = 'flex';
        blogFilters.style.display = 'flex';
        
        // Reset and start slide-in animation
        setTimeout(() => {
            articlesContainer.style.opacity = '1';
            articlesContainer.style.transform = 'translateX(0)';
            blogHeader.style.opacity = '1';
            blogHeader.style.transform = 'translateX(0)';
            blogFilters.style.opacity = '1';
            blogFilters.style.transform = 'translateX(0)';
        }, 50);
        
    }, 400);
    
    // Scroll to top
    document.getElementById('blog-view').scrollTop = 0;
}

// URL handling functions
function handleInitialURL() {
    const hash = window.location.hash;
    if (hash.startsWith('#blog/')) {
        const fullPath = hash.substring(6); // Remove '#blog/'
        const [articleId, headerAnchor] = fullPath.split('#');
        
        // Wait for articles to load first
        setTimeout(() => {
            if (allArticles.length > 0) {
                const article = allArticles.find(a => a.id === articleId);
                if (article) {
                    // Switch to blog view first
                    if (!blogActive) {
                        toggleBlogView();
                    }
                    // Then open the specific article
                    setTimeout(() => {
                        openBlogArticle(articleId, false);
                        
                        // If there's a header anchor, scroll to it after content loads
                        if (headerAnchor) {
                            setTimeout(() => {
                                const targetElement = document.getElementById(headerAnchor);
                                if (targetElement) {
                                    targetElement.scrollIntoView({ behavior: 'smooth' });
                                }
                            }, 600);
                        }
                    }, 500);
                }
            }
        }, 100);
    } else if (hash && hash.length > 1) {
        // Check if it's a header anchor in the current article
        // This will be handled after article content loads
    }
}

function handleURLChange(event) {
    const hash = window.location.hash;
    if (hash.startsWith('#blog/')) {
        const fullPath = hash.substring(6);
        const [articleId, headerAnchor] = fullPath.split('#');
        const article = allArticles.find(a => a.id === articleId);
        
        if (article) {
            if (!blogActive) {
                toggleBlogView();
                setTimeout(() => {
                    openBlogArticle(articleId, false);
                    if (headerAnchor) {
                        setTimeout(() => {
                            const targetElement = document.getElementById(headerAnchor);
                            if (targetElement) {
                                targetElement.scrollIntoView({ behavior: 'smooth' });
                            }
                        }, 600);
                    }
                }, 500);
            } else {
                openBlogArticle(articleId, false);
                if (headerAnchor) {
                    setTimeout(() => {
                        const targetElement = document.getElementById(headerAnchor);
                        if (targetElement) {
                            targetElement.scrollIntoView({ behavior: 'smooth' });
                        }
                    }, 500);
                }
            }
        }
    } else if (hash === '' && blogActive) {
        // If hash is cleared and we're in blog view, close article if open
        const articleReader = document.getElementById('article-reader');
        if (!articleReader.classList.contains('hidden')) {
            closeBlogArticle(false);
        }
    }
}

function copyArticleLink(articleId) {
    const articleURL = `${window.location.origin}${window.location.pathname}#blog/${articleId}`;
    navigator.clipboard.writeText(articleURL).then(() => {
        // Visual feedback
        const button = event.target;
        const originalText = button.textContent;
        button.textContent = 'Copied to clipboard';
        button.disabled = true;
        setTimeout(() => {
            button.textContent = originalText;
            button.disabled = false;
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy: ', err);
        // Fallback: show the URL in an alert
        alert(`Article URL: ${articleURL}`);
    });
}

function copyHeaderLink(headerId) {
    // Get current article ID from URL or find it another way
    let currentArticleId = '';
    const hash = window.location.hash;
    if (hash.startsWith('#blog/')) {
        currentArticleId = hash.substring(6).split('#')[0];
    }
    
    const headerURL = `${window.location.origin}${window.location.pathname}#blog/${currentArticleId}#${headerId}`;
    navigator.clipboard.writeText(headerURL).then(() => {
        // Visual feedback
        const headerLink = document.querySelector(`[data-header-id="${headerId}"]`);
        if (headerLink) {
            const originalText = headerLink.textContent;
            headerLink.textContent = 'Copied';
            headerLink.disabled = true;
            setTimeout(() => {
                headerLink.textContent = originalText;
                headerLink.disabled = false;
            }, 2000);
        }
    }).catch(err => {
        console.error('Failed to copy: ', err);
        alert(`Header URL: ${headerURL}`);
    });
}

// Simple markdown parser (basic implementation)
function parseMarkdown(markdown) {
    // Remove frontmatter
    markdown = markdown.replace(/^---[\s\S]*?---\n/, '');
    
    // Function to create URL-friendly anchor from header text
    function createAnchor(text) {
        return text.toLowerCase()
            .replace(/[^\w\s-]/g, '') // Remove special characters
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/-+/g, '-') // Replace multiple hyphens with single
            .trim('-'); // Remove leading/trailing hyphens
    }
    
    let html = markdown
        // Headers with anchor links (only # and ##)
        .replace(/^## (.*$)/gim, (match, headerText) => {
            const anchor = createAnchor(headerText);
            return `<h2 id="${anchor}">${headerText} <button class="header-link" data-header-id="${anchor}" onclick="copyHeaderLink('${anchor}')" title="Copy link to this section">Link</button></h2>`;
        })
        .replace(/^# (.*$)/gim, (match, headerText) => {
            const anchor = createAnchor(headerText);
            return `<h1 id="${anchor}">${headerText} <button class="header-link" data-header-id="${anchor}" onclick="copyHeaderLink('${anchor}')" title="Copy link to this section">Link</button></h1>`;
        })
        // Headers without anchor links (###)
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        
        // Bold and italic
        .replace(/\*\*\*(.*?)\*\*\*/gim, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/gim, '<em>$1</em>')
        
        // Code blocks
        .replace(/```(\w+)?\n([\s\S]*?)```/gim, '<pre><code>$2</code></pre>')
        .replace(/`(.*?)`/gim, '<code>$1</code>')
        
        // Links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank">$1</a>')
        
        // Blockquotes
        .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
        
        // Lists
        .replace(/^\* (.*$)/gim, '<li>$1</li>')
        .replace(/^- (.*$)/gim, '<li>$1</li>')
        .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
        
        // Line breaks and paragraphs
        .replace(/\n\n/gim, '</p><p>')
        .replace(/\n/gim, '<br>');
    
    // Wrap in paragraphs and fix lists
    html = '<p>' + html + '</p>';
    html = html.replace(/<p><\/p>/gim, '');
    html = html.replace(/<p>(<li>.*?<\/li>)<\/p>/gim, '<ul>$1</ul>');
    html = html.replace(/<\/li><br><li>/gim, '</li><li>');
    html = html.replace(/<p>(<h[1-6]>.*?<\/h[1-6]>)<\/p>/gim, '$1');
    html = html.replace(/<p>(<pre><code>.*?<\/code><\/pre>)<\/p>/gim, '$1');
    html = html.replace(/<p>(<blockquote>.*?<\/blockquote>)<\/p>/gim, '$1');
    
    return html;
}

// Utility function to format dates
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Add CSS for loading and error states
const additionalCSS = `
.loading, .error {
    text-align: center;
    padding: 40px;
    color: var(--muted-text);
    font-style: italic;
}

.error {
    color: var(--red);
}

.no-articles {
    text-align: center;
    padding: 40px;
    color: var(--muted-text);
    font-style: italic;
    grid-column: 1 / -1;
}

.filter-tag.active {
    background: var(--accent-green) !important;
    color: white !important;
    border-color: var(--accent-green) !important;
}

/* Article share and header styling */
.article-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 1px solid var(--surface-secondary);
}

.back-link {
    background: var(--surface-secondary);
    color: var(--text-primary);
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9em;
    transition: all 0.3s ease;
    text-decoration: none;
    display: inline-block;
}

.back-link:hover {
    background: var(--surface-tertiary);
    transform: translateY(-1px);
}

.share-button {
    background: var(--accent-green);
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9em;
    transition: all 0.3s ease;
    white-space: nowrap;
}

.share-button:hover:not(:disabled) {
    background: var(--accent-green-hover, #0e8043);
    transform: translateY(-1px);
}

.share-button:disabled {
    background: var(--muted-text);
    cursor: not-allowed;
    transform: none;
}

/* Header link buttons */
.header-link {
    background: none;
    border: none;
    color: var(--muted-text);
    cursor: pointer;
    font-size: 0.6em;
    margin-left: 8px;
    padding: 4px 6px;
    border-radius: 3px;
    opacity: 0;
    transition: all 0.3s ease;
    vertical-align: middle;
}

h1:hover .header-link,
h2:hover .header-link {
    opacity: 1;
}

.header-link:hover:not(:disabled) {
    background: var(--surface-secondary);
    color: var(--accent-green);
    transform: scale(1.05);
}

.header-link:disabled {
    background: var(--surface-secondary);
    color: var(--accent-green);
    cursor: not-allowed;
    opacity: 1;
}

/* Smooth scrolling for anchor links */
html {
    scroll-behavior: smooth;
}

@media (max-width: 768px) {
    .blog-container {
        padding: 20px 10px;
    }
    
    .article-card {
        padding: 16px;
    }
    
    .article-meta {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
    }
    
    .article-tags {
        width: 100%;
    }
    
    .article-header {
        gap: 15px;
    }
    
    .share-button {
        padding: 6px 12px;
        font-size: 0.8em;
    }
}
`;

// Inject additional CSS
const style = document.createElement('style');
style.textContent = additionalCSS;
document.head.appendChild(style);
