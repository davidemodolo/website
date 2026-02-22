# How to Add New Blog Articles

This is a mock article that explains how to add new articles to this blog system.

## Article Structure

To add a new article to this blog, you need to:

### 1. Add Entry to articles.json

Add a new article object to the `articles` array in `blog/articles.json`:

```json
{
  "id": "your-article-slug",
  "title": "Your Article Title",
  "excerpt": "A brief description of your article that will appear in the preview.",
  "date": "YYYY-MM-DD",
  "topic": "Category Name",
  "tags": ["tag1", "tag2", "tag3"],
  "filename": "your-article-slug.md",
  "readTime": "X min read"
}
```

### 2. Create Markdown File

Create a new `.md` file in the `blog/articles/` directory with the same name as specified in the `filename` field.

## Article Fields Explanation

- **id**: Unique identifier (used in URLs), should match filename without .md
- **title**: The article title displayed in the blog
- **excerpt**: Short description shown in article previews
- **date**: Publication date in YYYY-MM-DD format
- **topic**: Category for filtering (displayed with green background)
- **tags**: Array of tags for additional filtering
- **filename**: The markdown file name (must exist in blog/articles/)
- **readTime**: Estimated reading time displayed in the UI

## Markdown Content

Your markdown file can include:

- **Headers**: Use `#`, `##`, `###` for different heading levels
- **Code blocks**: Use triple backticks with language specification
- **Links**: Standard markdown links `[text](url)`
- **Lists**: Both numbered and bulleted lists
- **Images**: `![alt text](image-url)` (place images in root directory)
- **Emphasis**: Use `*italic*` and `**bold**`

## Example Markdown Structure

```markdown
# Article Title

Introduction paragraph...

## Section Heading

Content with **bold text** and *italic text*.

### Subsection

- Bullet point 1
- Bullet point 2

```code
// Code example
console.log("Hello, world!");
```

## Conclusion

Final thoughts...
```

## File Organization

```
blog/
├── articles.json          # Article metadata
└── articles/
    ├── how-to-add-articles.md
    ├── your-new-article.md
    └── another-article.md
```

## SEO and Indexing

The current implementation renders articles dynamically with JavaScript, which means:

- **Search engines**: May have limited crawling of individual articles
- **Social sharing**: Previews might not work optimally
- **Direct links**: Work but content loads via JS

For better SEO, consider:
- Pre-rendering articles as static HTML
- Adding meta tags for each article
- Implementing server-side rendering
- Creating a sitemap.xml

## Next Steps

1. Replace this mock article with your own content
2. Update the articles.json with your article metadata
3. Create your markdown files in the articles directory
4. Test the blog functionality
5. Consider SEO improvements if needed

Happy blogging! 
