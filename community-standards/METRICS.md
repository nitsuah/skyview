# Skyview Metrics

This document outlines the key metrics for the Skyview project.

## Metrics Table

| Metric                      | Current | Target | Status |
|-----------------------------|---------|--------|--------|
| CSS Test Coverage           | 0%      | 80%    |  🔴     |
| Number of CSS Tests         | 0       | 50     |  🔴     |
| Stylelint Score             | TBD     | 9.0    |  🟡     |
| Cyclomatic Complexity (Avg) | TBD     | < 5   |  🟡     |
| Lines of CSS Code (LOC)    | TBD     | < 500  |  🟡     |
| Critical CSS Render Time    | TBD ms  | < 200ms|  🟡     |
| First Contentful Paint (FCP) | TBD ms  | < 1000ms| 🟡     |
| CI/CD Pipeline Success Rate | 0%      | 95%    |  🔴     |
| Browser Compatibility       | Chrome  | Chrome, Firefox, Safari | 🟡 |
| CSS Bundle Size             | TBD KB  | < 50KB |  🟡     |
| Number of CSS Selectors     | TBD     | < 200  | 🟡 |

**Status Indicators:**

*   🟢: On Track
*   🟡: Needs Attention
*   🔴: Critical

## How to Update

Follow these steps to update the metrics:

1.  **CSS Test Coverage & Number of CSS Tests:** Implement CSS testing using a framework like [TODO: Testing Framework Name] and a headless browser environment.  Run tests via CI/CD and report results. Example command (adapt as needed):
    ```bash
    # Example command assuming a testing framework with CLI
    npm test
    ```

2.  **Stylelint Score:**  Run Stylelint with a defined configuration and analyze the report.
    ```bash
    npx stylelint "**/*.css"
    ```
    Update the score based on the number of errors/warnings.  Improve config to enforce better styles.

3.  **Cyclomatic Complexity & Lines of CSS Code (LOC):** Use a CSS complexity analyzer tool like [TODO: CSS Analysis Tool Name] to calculate the complexity and LOC. Example:
    ```bash
    # Example command using a hypothetical CSS analysis tool
    css-analyzer --complexity "**/*.css"
    css-analyzer --loc "**/*.css"
    ```

4. **Critical CSS Render Time & First Contentful Paint (FCP):** Measure these performance metrics using browser developer tools or a web performance testing service like [TODO: Web Performance Testing Service].  Include testing as part of CI/CD.

5.  **CI/CD Pipeline Success Rate:** Monitor the success rate of CI/CD pipeline runs in your CI/CD platform (e.g., GitHub Actions, GitLab CI).

6.  **Browser Compatibility:** Manually test the CSS rendering in different browsers and versions, or use automated browser testing tools like [TODO: Browser Testing Tool].

7.  **CSS Bundle Size:**  Measure the size of the CSS files after minification and compression using tools like `gzip` or `brotli`. Example:
    ```bash
    gzip -c style.min.css | wc -c
    ```

8.  **Number of CSS Selectors:** Use a CSS analysis tool or write a script to count the number of selectors in the CSS files. Example using `grep` (may need refinement):
    ```bash
    grep -c -E "^[a-zA-Z.#]" style.css
    ```

Update the "Current" column in the Metrics Table with the latest values.  Adjust "Target" values as needed to reflect project goals.