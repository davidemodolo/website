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
async function openBlogArticle(articleId) {
    const article = allArticles.find(a => a.id === articleId);
    if (!article) return;
    
    try {
        // Show loading state
        const articleContent = document.getElementById('article-content');
        articleContent.innerHTML = '<div class="loading">Loading article...</div>';
        
        // Start slide-out animation for main blog content
        const articlesContainer = document.getElementById('articles-container');
        const blogHeader = document.querySelector('.blog-header');
        const blogFilters = document.getElementById('blog-filters');
        const articleReader = document.getElementById('article-reader');
        
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
}

// Helper function to load article content
async function loadArticleContent(article) {
    try {
        const response = await fetch(`blog/articles/${article.filename}`);
        const markdown = await response.text();
        
        // Parse markdown to HTML
        const html = parseMarkdown(markdown);
        
        // Display the article
        document.getElementById('article-content').innerHTML = html;
    } catch (error) {
        console.error('Error loading article content:', error);
        document.getElementById('article-content').innerHTML = 
            '<div class="error">Error loading article content. Please try again.</div>';
    }
}

// Close blog article and return to articles list
function closeBlogArticle() {
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

// Simple markdown parser (basic implementation)
function parseMarkdown(markdown) {
    // Remove frontmatter
    markdown = markdown.replace(/^---[\s\S]*?---\n/, '');
    
    let html = markdown
        // Headers
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        
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
}
`;

// Inject additional CSS
const style = document.createElement('style');
style.textContent = additionalCSS;
document.head.appendChild(style);
