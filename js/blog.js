// Blog functionality for the portfolio website

let allArticles = [];
let filteredArticles = [];
let activeFilters = {
    topics: [],
    tags: [],
    search: ''
};

// Initialize blog functionality
document.addEventListener('DOMContentLoaded', function() {
    loadArticles();
    handleInitialURL();
    
    // Handle browser back/forward buttons
    window.addEventListener('popstate', handleURLChange);
});

// Load articles from JSON file
async function loadArticles() {
    try {
        const response = await fetch('blog/articles.json');
        const data = await response.json();
        if (data && data.articles) {
            allArticles = data.articles.sort((a, b) => new Date(b.date) - new Date(a.date));
            filteredArticles = [...allArticles];
            displayArticles();
            setupFilters();
        } else {
            throw new Error('Invalid articles format');
        }
    } catch (error) {
        console.error('Error loading articles:', error);
        allArticles = [];
        filteredArticles = [];
        document.getElementById('articles-container').innerHTML = '<div class="no-articles">No articles found.</div>';
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
                <div class="tags">
                    ${article.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
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
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            activeFilters.search = e.target.value.toLowerCase();
            applyFilters();
        });
    }
}

// Toggle a filter on/off
function toggleFilter(type, value) {
    const filterArray = type === 'topic' ? activeFilters.topics : activeFilters.tags;
    const index = filterArray.indexOf(value);
    
    if (index === -1) {
        filterArray.push(value);
    } else {
        filterArray.splice(index, 1);
    }
    
    // Update UI
    updateFilterUI();
    
    // Apply filters
    applyFilters();
}

// Update filter UI to show active state
function updateFilterUI() {
    document.querySelectorAll('.filter-tag').forEach(el => {
        const type = el.dataset.type;
        const value = el.dataset.value;
        
        if ((type === 'topic' && activeFilters.topics.includes(value)) ||
            (type === 'tag' && activeFilters.tags.includes(value))) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });
}

// Apply all active filters
function applyFilters() {
    filteredArticles = allArticles.filter(article => {
        // Check search
        if (activeFilters.search && 
            !article.title.toLowerCase().includes(activeFilters.search) && 
            !article.excerpt.toLowerCase().includes(activeFilters.search)) {
            return false;
        }
        
        // Check topics
        if (activeFilters.topics.length > 0 && !activeFilters.topics.includes(article.topic)) {
            return false;
        }
        
        // Check tags
        if (activeFilters.tags.length > 0 && !activeFilters.tags.some(tag => article.tags.includes(tag))) {
            return false;
        }
        
        return true;
    });
    
    displayArticles();
}

// Open a specific article
async function openBlogArticle(articleId) {
    const article = allArticles.find(a => a.id === articleId);
    if (!article) return;
    
    const reader = document.getElementById('article-reader');
    const content = document.getElementById('article-content');
    const container = document.getElementById('articles-container');
    const filters = document.getElementById('blog-filters');
    const search = document.getElementById('blog-search-input');
    
    // Show loading state
    content.innerHTML = '<div class="loading">Loading article...</div>';
    
    // Hide list, show reader
    container.classList.add('hidden');
    if (filters) filters.classList.add('hidden');
    if (search) search.classList.add('hidden');
    reader.classList.remove('hidden');
    
    // Update URL
    const newUrl = new URL(window.location);
    newUrl.searchParams.set('article', articleId);
    window.history.pushState({ articleId }, '', newUrl);
    
    try {
        // Fetch markdown content
        const response = await fetch(`blog/articles/${article.filename}`);
        if (!response.ok) throw new Error('Failed to load article content');
        
        const markdown = await response.text();
        
        // Parse markdown
        const htmlContent = marked.parse(markdown);
        
        // Render article
        content.innerHTML = `
            <div class="article-header-full">
                <h1 class="article-title-full">${article.title}</h1>
                <div class="article-meta-full" style="color: var(--muted-text); margin-bottom: 2rem; font-size: 0.9rem;">
                    <span>${formatDate(article.date)}</span>
                    <span>•</span>
                    <span>${article.readTime || '5 min read'}</span>
                    <span>•</span>
                    <span class="article-topic">${article.topic}</span>
                </div>
            </div>
            <div class="article-body">
                ${htmlContent}
            </div>
        `;
        
        // Scroll to top of reader
        reader.scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error('Error loading article:', error);
        content.innerHTML = `
            <div class="error-message">
                <h3>Oops! Something went wrong.</h3>
                <p>Could not load the article content. Please try again later.</p>
                <button onclick="closeBlogArticle()" class="btn">Go Back</button>
            </div>
        `;
    }
}

// Close the article reader and return to list
function closeBlogArticle() {
    const reader = document.getElementById('article-reader');
    const container = document.getElementById('articles-container');
    const filters = document.getElementById('blog-filters');
    const search = document.getElementById('blog-search-input');
    
    reader.classList.add('hidden');
    container.classList.remove('hidden');
    if (filters) filters.classList.remove('hidden');
    if (search) search.classList.remove('hidden');
    
    // Update URL
    const newUrl = new URL(window.location);
    newUrl.searchParams.delete('article');
    window.history.pushState({}, '', newUrl);
    
    // Scroll to blog section
    document.getElementById('blog').scrollIntoView({ behavior: 'smooth' });
}

// Handle initial URL parameters
function handleInitialURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const articleId = urlParams.get('article');
    
    if (articleId) {
        // Wait for articles to load before opening
        const checkInterval = setInterval(() => {
            if (allArticles.length > 0) {
                clearInterval(checkInterval);
                openBlogArticle(articleId);
            }
        }, 100);
        
        // Timeout after 5 seconds
        setTimeout(() => clearInterval(checkInterval), 5000);
    }
}

// Handle browser back/forward buttons
function handleURLChange(event) {
    const urlParams = new URLSearchParams(window.location.search);
    const articleId = urlParams.get('article');
    
    if (articleId) {
        openBlogArticle(articleId);
    } else {
        closeBlogArticle();
    }
}

// Helper function to format dates
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}
