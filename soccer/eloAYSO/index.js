/*
// REFERENCE for ELO and scoring 
// https://resources.fifa.com/image/upload/revision-of-the-fifa-coca-cola-world-ranking.pdf?cloudid=iklxmt2jejtjwf8qecba
// https://fivethirtyeight.com/features/introducing-nfl-elo-ratings/ 
*/

let _bUseScores = false;
let _bDecimal = 0;
let _kFactor = 40; //25; // higher convergence factor for younger players
let _chanceWinDivider = 600;

let _bTournamentScoring = false;

/****************************************
*
* Division Configuration and Infrastructure
*
*****************************************/

// Division configuration object with proxy base URL and division-specific URLs
const _divisionConfig = {
    proxyBaseUrl: "https://p-ayso.vbokin.workers.dev/?url=",
    divisions: {
        "10u Boys": {
            standings: "https://cgisports.com/ref/5555/stats/?user=public&ck=&div_standings=10UB&search_records=Search",
            regular: "https://cgisports.com/ref/5555/stats/?user=public&ck=&search_records=Search&div_schedule=10UB",
            playoff: "https://cgisports.com/ref/5555/stats/?user=public&ck=&search_records=Search&div_schedule=10UB-Post+Season"
        },
        "10u Girls": {
            standings: "https://cgisports.com/ref/5555/stats/?user=public&ck=&div_standings=10UG&search_records=Search",
            regular: "https://cgisports.com/ref/5555/stats/?user=public&ck=&search_records=Search&div_schedule=10UG",
            playoff: "https://cgisports.com/ref/5555/stats/?user=public&ck=&search_records=Search&div_schedule=10UG-Post+Season"
        },
        "12u Boys": {
            standings: "https://cgisports.com/ref/5555/stats/?user=public&ck=&div_standings=12UB&search_records=Search",
            regular: "https://cgisports.com/ref/5555/stats/?user=public&ck=&search_records=Search&div_schedule=12UB",
            playoff: "https://cgisports.com/ref/5555/stats/?user=public&ck=&search_records=Search&div_schedule=12UB-Post+Season"
        },
        "12u Girls": {
            standings: "https://cgisports.com/ref/5555/stats/?user=public&ck=&div_standings=12UG&search_records=Search",
            regular: "https://cgisports.com/ref/5555/stats/?user=public&ck=&search_records=Search&div_schedule=12UG",
            playoff: "https://cgisports.com/ref/5555/stats/?user=public&ck=&search_records=Search&div_schedule=12UG-Post+Season"
        },
        "14u Boys": {
            standings: "https://cgisports.com/ref/5555/stats/?user=public&ck=&div_standings=14uB&search_records=Search",
            regular: "https://cgisports.com/ref/5555/stats/?user=public&ck=&search_records=Search&div_schedule=14uB",
            playoff: "https://cgisports.com/ref/5555/stats/?user=public&ck=&search_records=Search&div_schedule=14uB-Post+Season"
        },
        "14u Girls": {
            standings: "https://cgisports.com/ref/5555/stats/?user=public&ck=&div_standings=14uG&search_records=Search",
            regular: "https://cgisports.com/ref/5555/stats/?user=public&ck=&search_records=Search&div_schedule=14uG",
            playoff: "https://cgisports.com/ref/5555/stats/?user=public&ck=&search_records=Search&div_schedule=14uG-Post+Season"
        }


    }
};

// Current selected division
let _currentDivision = null;

/**
 * Division Configuration Manager Class
 * Manages division configurations and URL construction for proxy requests
 */
class DivisionConfig {
    constructor(proxyBaseUrl, divisions) {
        this.proxyBaseUrl = proxyBaseUrl;
        this.divisions = divisions || {};
    }

    /**
     * Get array of available division names
     * @returns {Array} Array of division names
     */
    getDivisions() {
        return Object.keys(this.divisions);
    }

    /**
     * Get URLs for a specific division
     * @param {string} divisionName - Name of the division
     * @returns {Object|null} Object containing {standings, regular, playoff} URLs or null if not found
     */
    getDivisionUrls(divisionName) {
        if (!divisionName || !this.divisions[divisionName]) {
            return null;
        }
        return this.divisions[divisionName];
    }

    /**
     * Construct proxy URL with URL encoding
     * @param {string} targetUrl - The target URL to be proxied
     * @returns {string} Complete proxy URL with encoded target
     */
    constructProxyUrl(targetUrl) {
        if (!targetUrl || !this.proxyBaseUrl) {
            return null;
        }
        return this.proxyBaseUrl + encodeURIComponent(targetUrl);
    }

    /**
     * Validate division configuration
     * @param {string} divisionName - Optional division name to validate specific division
     * @returns {Object} Validation result with isValid boolean and errors array
     */
    validateConfiguration(divisionName) {
        const errors = [];
        
        // Validate proxy base URL
        if (!this.proxyBaseUrl || typeof this.proxyBaseUrl !== 'string') {
            errors.push('Proxy base URL is missing or invalid');
        }

        // Validate divisions object
        if (!this.divisions || typeof this.divisions !== 'object') {
            errors.push('Divisions configuration is missing or invalid');
            return { isValid: false, errors: errors };
        }

        // If specific division requested, validate only that one
        if (divisionName) {
            return this._validateSingleDivision(divisionName, errors);
        }

        // Validate all divisions
        const divisionNames = Object.keys(this.divisions);
        if (divisionNames.length === 0) {
            errors.push('No divisions configured');
        }

        for (const name of divisionNames) {
            const divisionResult = this._validateSingleDivision(name, []);
            if (!divisionResult.isValid) {
                errors.push(`Division "${name}": ${divisionResult.errors.join(', ')}`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Validate a single division configuration
     * @private
     * @param {string} divisionName - Name of the division to validate
     * @param {Array} existingErrors - Array to append errors to
     * @returns {Object} Validation result
     */
    _validateSingleDivision(divisionName, existingErrors) {
        const errors = [...existingErrors];
        const division = this.divisions[divisionName];

        if (!division) {
            errors.push(`Division "${divisionName}" not found`);
            return { isValid: false, errors: errors };
        }

        // Check required URLs
        const requiredUrls = ['standings', 'regular', 'playoff'];
        for (const urlType of requiredUrls) {
            if (!division[urlType] || typeof division[urlType] !== 'string') {
                errors.push(`${urlType} URL is missing or invalid`);
            }
        }

        return {
            isValid: errors.length === existingErrors.length,
            errors: errors
        };
    }
}

/**
 * URL Encoding Utility Functions
 */

/**
 * Safely encode URL for use in proxy requests
 * @param {string} url - URL to encode
 * @returns {string|null} Encoded URL or null if invalid input
 */
function encodeUrlForProxy(url) {
    if (!url || typeof url !== 'string') {
        return null;
    }
    
    try {
        return encodeURIComponent(url);
    } catch (error) {
        console.error('Error encoding URL:', error);
        return null;
    }
}

/**
 * Validate URL format before encoding
 * @param {string} url - URL to validate
 * @returns {boolean} True if URL appears valid
 */
function isValidUrl(url) {
    if (!url || typeof url !== 'string') {
        return false;
    }
    
    try {
        new URL(url);
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Construct complete proxy URL with validation and encoding
 * @param {string} proxyBaseUrl - Base proxy URL
 * @param {string} targetUrl - Target URL to proxy
 * @returns {string|null} Complete proxy URL or null if invalid
 */
function buildProxyUrl(proxyBaseUrl, targetUrl) {
    if (!isValidUrl(targetUrl)) {
        console.error('Invalid target URL:', targetUrl);
        return null;
    }
    
    if (!proxyBaseUrl || typeof proxyBaseUrl !== 'string') {
        console.error('Invalid proxy base URL:', proxyBaseUrl);
        return null;
    }
    
    const encodedUrl = encodeUrlForProxy(targetUrl);
    if (!encodedUrl) {
        return null;
    }
    
    return proxyBaseUrl + encodedUrl;
}

// Initialize global division configuration manager
const _divisionConfigManager = new DivisionConfig(_divisionConfig.proxyBaseUrl, _divisionConfig.divisions);

/**
 * Division Configuration Validation and Helper Functions
 */

/**
 * Validate the global division configuration on startup
 * @returns {boolean} True if configuration is valid
 */
function validateGlobalDivisionConfig() {
    const validation = _divisionConfigManager.validateConfiguration();
    
    if (!validation.isValid) {
        console.error('Division configuration validation failed:', validation.errors);
        setError('Division configuration error: ' + validation.errors.join('; '));
        return false;
    }
    
    console.log('Division configuration validated successfully');
    return true;
}

/**
 * Get available divisions for UI display
 * @returns {Array} Array of division names
 */
function getAvailableDivisions() {
    return _divisionConfigManager.getDivisions();
}

/**
 * Get URLs for a specific division
 * @param {string} divisionName - Name of the division
 * @returns {Object|null} Division URLs or null if not found
 */
function getDivisionUrls(divisionName) {
    return _divisionConfigManager.getDivisionUrls(divisionName);
}

/**
 * Set the current division and validate it
 * @param {string} divisionName - Name of the division to set as current
 * @returns {boolean} True if division was set successfully
 */
function setCurrentDivision(divisionName) {
    if (!divisionName) {
        _currentDivision = null;
        return false;
    }
    
    // Validate the specific division
    const validation = _divisionConfigManager.validateConfiguration(divisionName);
    if (!validation.isValid) {
        console.error(`Division "${divisionName}" validation failed:`, validation.errors);
        setError(`Division "${divisionName}" configuration error: ` + validation.errors.join('; '));
        return false;
    }
    
    _currentDivision = divisionName;
    console.log(`Current division set to: ${divisionName}`);
    return true;
}

/**
 * Get the current division
 * @returns {string|null} Current division name or null if none set
 */
function getCurrentDivision() {
    return _currentDivision;
}

/**
 * Construct proxy URLs for the current division
 * @returns {Object|null} Object with constructed proxy URLs or null if no current division
 */
function getCurrentDivisionProxyUrls() {
    if (!_currentDivision) {
        return null;
    }
    
    const urls = getDivisionUrls(_currentDivision);
    if (!urls) {
        return null;
    }
    
    return {
        standings: _divisionConfigManager.constructProxyUrl(urls.standings),
        regular: _divisionConfigManager.constructProxyUrl(urls.regular),
        playoff: _divisionConfigManager.constructProxyUrl(urls.playoff)
    };
}

/**
 * Check if a division exists in the configuration
 * @param {string} divisionName - Name of the division to check
 * @returns {boolean} True if division exists
 */
function divisionExists(divisionName) {
    return _divisionConfigManager.getDivisions().indexOf(divisionName) !== -1;
}

/**
 * Get division configuration summary for debugging
 * @returns {Object} Summary of division configuration
 */
function getDivisionConfigSummary() {
    const divisions = getAvailableDivisions();
    return {
        proxyBaseUrl: _divisionConfig.proxyBaseUrl,
        totalDivisions: divisions.length,
        divisions: divisions,
        currentDivision: _currentDivision,
        isValid: validateGlobalDivisionConfig()
    };
}

/**
 * Test function for division configuration - can be called from browser console
 * @returns {Object} Test results
 */
function testDivisionConfiguration() {
    console.log('=== Division Configuration Test ===');
    
    // Test 1: Basic configuration validation
    console.log('1. Testing basic configuration validation...');
    const isValid = validateGlobalDivisionConfig();
    console.log('Configuration valid:', isValid);
    
    // Test 2: Get available divisions
    console.log('2. Testing available divisions...');
    const divisions = getAvailableDivisions();
    console.log('Available divisions:', divisions);
    
    // Test 3: Test URL construction for each division
    console.log('3. Testing URL construction...');
    const urlTests = {};
    divisions.forEach(division => {
        const urls = getDivisionUrls(division);
        if (urls) {
            urlTests[division] = {
                standings: _divisionConfigManager.constructProxyUrl(urls.standings),
                regular: _divisionConfigManager.constructProxyUrl(urls.regular),
                playoff: _divisionConfigManager.constructProxyUrl(urls.playoff)
            };
        }
    });
    console.log('Constructed proxy URLs:', urlTests);
    
    // Test 4: Test setting current division
    console.log('4. Testing division selection...');
    if (divisions.length > 0) {
        const testDivision = divisions[0];
        const setResult = setCurrentDivision(testDivision);
        console.log(`Set division "${testDivision}":`, setResult);
        console.log('Current division:', getCurrentDivision());
        
        const proxyUrls = getCurrentDivisionProxyUrls();
        console.log('Current division proxy URLs:', proxyUrls);
    }
    
    // Test 5: Test URL encoding utilities
    console.log('5. Testing URL encoding utilities...');
    const testUrl = 'https://example.com/test?param=value&other=test';
    const encoded = encodeUrlForProxy(testUrl);
    const isValidTest = isValidUrl(testUrl);
    const proxyUrl = buildProxyUrl(_divisionConfig.proxyBaseUrl, testUrl);
    console.log('URL encoding test:', {
        original: testUrl,
        encoded: encoded,
        isValid: isValidTest,
        proxyUrl: proxyUrl
    });
    
    console.log('=== Test Complete ===');
    
    return {
        configurationValid: isValid,
        divisionsCount: divisions.length,
        divisions: divisions,
        urlConstructionTest: urlTests,
        currentDivision: getCurrentDivision(),
        summary: getDivisionConfigSummary()
    };
}

/****************************************
*
* Division Selector UI Component Functions
*
*****************************************/

// Division selector state management
const DIVISION_STORAGE_KEY = 'selectedDivision';
let _divisionSelectorInitialized = false;

/**
 * Initialize the division selector UI component
 * Populates dropdown options and sets up event handlers
 */
function initializeDivisionSelector() {
    console.log('Initializing division selector UI component...');
    
    // Validate configuration before initializing UI
    if (!validateGlobalDivisionConfig()) {
        showDivisionStatus('Configuration error - division selector disabled', 'error');
        disableDivisionSelector();
        return false;
    }
    
    // Populate division options
    populateDivisionOptions();
    
    // Set up event handlers
    setupDivisionSelectorEventHandlers();
    
    // Load persisted division selection
    loadPersistedDivisionSelection();
    
    _divisionSelectorInitialized = true;
    console.log('Division selector initialized successfully');
    return true;
}

/**
 * Populate the division selector dropdown with available divisions
 */
function populateDivisionOptions() {
    const selector = $('#divisionSelector');
    const divisions = getAvailableDivisions();
    
    // Clear existing options except the default
    selector.find('option:not(:first)').remove();
    
    // Add division options
    divisions.forEach(function(division) {
        const option = $('<option></option>')
            .attr('value', division)
            .text(division);
        selector.append(option);
    });
    
    console.log(`Populated ${divisions.length} division options`);
}

/**
 * Set up event handlers for the division selector
 */
function setupDivisionSelectorEventHandlers() {
    $('#divisionSelector').on('change', function() {
        const selectedDivision = $(this).val();
        handleDivisionSelectionChange(selectedDivision);
    });
    
    console.log('Division selector event handlers configured');
}

/**
 * Handle division selection change event
 * @param {string} selectedDivision - The newly selected division name
 */
function handleDivisionSelectionChange(selectedDivision) {
    console.log('Division selection changed to:', selectedDivision);
    
    // Clear any existing status
    clearDivisionStatus();
    
    if (!selectedDivision || selectedDivision === '') {
        // Empty selection - clear current division
        handleDivisionDeselection();
        return;
    }
    
    // Validate the selected division
    if (!divisionExists(selectedDivision)) {
        showDivisionStatus(`Division "${selectedDivision}" not found`, 'error');
        resetDivisionSelector();
        return;
    }
    
    // Show loading state
    showDivisionStatus('Loading division data...', 'loading');
    disableDivisionSelector();
    
    // Set the current division
    const setResult = setCurrentDivision(selectedDivision);
    
    if (setResult) {
        // Successfully set division
        handleSuccessfulDivisionSelection(selectedDivision);
    } else {
        // Failed to set division
        handleFailedDivisionSelection(selectedDivision);
    }
}

/**
 * Handle successful division selection
 * @param {string} divisionName - The successfully selected division name
 */
function handleSuccessfulDivisionSelection(divisionName) {
    console.log(`Successfully selected division: ${divisionName}`);
    
    // Update UI state
    showDivisionStatus(`${divisionName} selected`, 'success');
    enableDivisionSelector();
    
    // Persist the selection
    persistDivisionSelection(divisionName);
    
    // Clear existing data when switching divisions
    clearExistingDataForDivisionSwitch();
    
    // Update UI to reflect division change
    updateUIForDivisionChange(divisionName);
    
    // Trigger any additional division-specific initialization
    onDivisionSelectionComplete(divisionName);
}

/**
 * Handle failed division selection
 * @param {string} divisionName - The division that failed to be selected
 */
function handleFailedDivisionSelection(divisionName) {
    console.error(`Failed to select division: ${divisionName}`);
    
    // Update UI state
    showDivisionStatus(`Failed to load ${divisionName}`, 'error');
    enableDivisionSelector();
    
    // Reset selector to empty state
    resetDivisionSelector();
    
    // Clear current division
    _currentDivision = null;
}

/**
 * Handle division deselection (empty selection)
 */
function handleDivisionDeselection() {
    console.log('Division deselected');
    
    // Clear current division
    _currentDivision = null;
    
    // Clear persisted selection
    clearPersistedDivisionSelection();
    
    // Clear existing data
    clearExistingDataForDivisionSwitch();
    
    // Update UI
    clearDivisionStatus();
    updateUIForDivisionChange(null);
    
    // Clear any error messages related to data fetching
    clearError();
}

/**
 * Clear existing data when switching divisions
 */
function clearExistingDataForDivisionSwitch() {
    console.log('Clearing existing data for division switch...');
    
    // Clear the scores textarea
    $('#thescores').val('');
    
    // Clear the table and related data
    clearTable();
    
    // Clear any error messages
    clearError();
    
    // Clear games display
    clearGames();
    
    // Clear graph
    clearGraph();
    
    console.log('Existing data cleared');
}

/**
 * Update UI components for division change
 * @param {string|null} divisionName - The new division name or null if deselected
 */
function updateUIForDivisionChange(divisionName) {
    if (divisionName) {
        console.log(`Updating UI for division: ${divisionName}`);
        // Division selected - UI is ready for data entry or AJAX loading
        // Future tasks will handle AJAX data loading here
    } else {
        console.log('Updating UI for no division selected');
        // No division selected - UI shows empty state
    }
    
    // Update any division-specific UI elements
    updateDivisionSpecificUI(divisionName);
}

/**
 * Update division-specific UI elements
 * @param {string|null} divisionName - The current division name or null
 */
function updateDivisionSpecificUI(divisionName) {
    // Update external link in control panel to match selected division
    updateExternalLink(divisionName);
    
    // Update page title or subtitle if needed
    updatePageTitleForDivision(divisionName);
}

/**
 * Update external link in control panel for the selected division
 * @param {string|null} divisionName - The current division name or null
 */
function updateExternalLink(divisionName) {
    const linkElement = $('.external-link').first();
    
    if (divisionName && linkElement.length > 0) {
        const urls = getDivisionUrls(divisionName);
        if (urls && urls.regular) {
            linkElement.attr('href', urls.regular);
            linkElement.text(`${divisionName} Scores ↗`);
        }
    } else if (linkElement.length > 0) {
        // Reset to default or hide
        linkElement.attr('href', 'https://cgisports.com/ref/5555/stats/?user=public&ck=&search_records=Search&div_schedule=12UB');
        linkElement.text('12uB Scores ↗');
    }
}

/**
 * Update page title or subtitle for division context
 * @param {string|null} divisionName - The current division name or null
 */
function updatePageTitleForDivision(divisionName) {
    const subtitleElement = $('.page-subtitle');
    
    if (divisionName && subtitleElement.length > 0) {
        subtitleElement.text(`Soccer Team Analytics & Head-to-Head Comparisons - ${divisionName}`);
    } else if (subtitleElement.length > 0) {
        subtitleElement.text('Soccer Team Analytics & Head-to-Head Comparisons');
    }
}

/**
 * Callback function called when division selection is complete
 * @param {string} divisionName - The successfully selected division name
 */
function onDivisionSelectionComplete(divisionName) {
    console.log(`Division selection complete: ${divisionName}`);
    
    // Validate that all required URLs are available
    const urls = getDivisionUrls(divisionName);
    if (urls) {
        console.log('Division URLs available:', {
            standings: !!urls.standings,
            regular: !!urls.regular,
            playoff: !!urls.playoff
        });
        
        // Trigger AJAX data fetching for the selected division
        triggerDivisionDataFetching(divisionName);
    } else {
        console.error(`No URLs configured for division: ${divisionName}`);
        showDivisionStatus(`Configuration error for ${divisionName}`, 'error');
    }
}

/**
 * Trigger AJAX data fetching for a division
 * @param {string} divisionName - The division name to fetch data for
 */
function triggerDivisionDataFetching(divisionName) {
    console.log(`Triggering data fetching for division: ${divisionName}`);
    
    // Validate division configuration before attempting fetch
    const validation = validateDivisionForDataFetch(divisionName);
    if (!validation.isValid) {
        console.error(`Division validation failed for ${divisionName}:`, validation.errors);
        const error = new Error(`Configuration error: ${validation.errors.join(', ')}`);
        error.type = 'configuration';
        handleDataFetchingError(divisionName, error);
        return;
    }
    
    // Log any warnings
    if (validation.warnings.length > 0) {
        console.warn(`Division validation warnings for ${divisionName}:`, validation.warnings);
    }
    
    // Show loading state
    showDivisionStatus('Fetching division data...', 'loading');
    disableDivisionSelector();
    
    // Get AJAX manager (already validated above)
    const ajaxManager = getAjaxDataManager();
    
    // Start data fetching
    ajaxManager.fetchAllData(divisionName)
        .then(fetchResult => {
            console.log(`Data fetching completed for ${divisionName}:`, fetchResult);
            handleDataFetchingSuccess(divisionName, fetchResult);
        })
        .catch(error => {
            console.error(`Data fetching failed for ${divisionName}:`, error);
            handleDataFetchingError(divisionName, error);
        });
}

/**
 * Handle successful data fetching
 * @param {string} divisionName - The division name
 * @param {Object} fetchResult - The fetch result object
 */
function handleDataFetchingSuccess(divisionName, fetchResult) {
    console.log(`Successfully fetched data for ${divisionName}`);
    
    // Check if we have warnings (partial success)
    const hasWarnings = fetchResult.warnings && fetchResult.warnings.length > 0;
    const hasErrors = fetchResult.errors && fetchResult.errors.length > 0;
    
    if (hasWarnings || hasErrors) {
        console.log('Data fetched with warnings/errors:', {
            warnings: fetchResult.warnings,
            errors: fetchResult.errors
        });
        
        // Still process the data but show appropriate status
        if (hasErrors) {
            showDivisionStatus(`${divisionName} data loaded with issues`, 'success');
        } else {
            showDivisionStatus(`${divisionName} data loaded`, 'success');
        }
    } else {
        // Complete success
        showDivisionStatus(`${divisionName} data loaded`, 'success');
    }
    
    enableDivisionSelector();
    
    // Process the fetched data
    processAjaxFetchedData(fetchResult);
    
    // Show any warnings to the user after processing
    if (hasWarnings) {
        setTimeout(() => {
            const warningMessage = `Data loaded successfully but with warnings: ${fetchResult.warnings.join(', ')}`;
            console.warn(warningMessage);
        }, 500);
    }
}

/**
 * Handle data fetching errors
 * @param {string} divisionName - The division name
 * @param {Error} error - The error that occurred
 */
function handleDataFetchingError(divisionName, error) {
    console.error(`Data fetching failed for ${divisionName}:`, error);
    
    // Update UI to show error
    showDivisionStatus(`Failed to load ${divisionName} data`, 'error');
    enableDivisionSelector();
    
    // Show error message to user with fallback option
    displayDataFetchingError(divisionName, error);
}

/**
 * Process AJAX-fetched data and integrate with existing ELO processing
 * @param {Object} fetchResult - The fetch result object from AJAX manager
 */
function processAjaxFetchedData(fetchResult) {
    console.log('Processing AJAX-fetched data:', fetchResult);
    
    try {
        // Get HTML data parser
        const parser = getHtmlDataParser();
        if (!parser) {
            throw new Error('HTML data parser not available');
        }
        
        // Parse the fetched data
        const parsedData = parseAllFetchedData(fetchResult, parser);
        
        // Convert to format compatible with existing processScores function
        const tabFormattedData = convertParsedDataToTabFormat(parsedData);
        
        if (tabFormattedData && tabFormattedData.trim().length > 0) {
            // Populate the textarea with the converted data for user visibility
            $('#thescores').val(tabFormattedData);
            
            // Process the data using enhanced processScores function with standings integration
            processScores(tabFormattedData, parsedData.standings);
            
            console.log('Successfully processed AJAX-fetched data');
            
            // Show success message if there were warnings but processing succeeded
            if (parsedData.warnings && parsedData.warnings.length > 0) {
                console.warn('Data processing completed with warnings:', parsedData.warnings);
            }
        } else {
            throw new Error('No valid match data found in fetched results');
        }
        
    } catch (error) {
        console.error('Error processing AJAX-fetched data:', error);
        
        // Show error but allow manual fallback
        setError(`Data processing error: ${error.message}. You can still enter data manually.`);
    }
}

/**
 * Parse all fetched data (standings, regular season, playoffs)
 * @param {Object} fetchResult - The fetch result object
 * @param {HtmlDataParser} parser - The HTML data parser instance
 * @returns {Object} Parsed data object
 */
function parseAllFetchedData(fetchResult, parser) {
    const parsedData = {
        divisionName: fetchResult.divisionName,
        standings: [],
        matches: [],
        errors: [...(fetchResult.errors || [])],
        warnings: [...(fetchResult.warnings || [])]
    };
    
    // Parse standings data if available
    if (fetchResult.standings) {
        try {
            parsedData.standings = parser.parseStandings(fetchResult.standings);
            console.log(`Parsed ${parsedData.standings.length} teams from standings`);
        } catch (error) {
            console.error('Error parsing standings:', error);
            parsedData.errors.push(`Standings parsing error: ${error.message}`);
        }
    }
    
    // Parse regular season matches if available
    if (fetchResult.regular) {
        try {
            const regularMatches = parser.parseMatches(fetchResult.regular, 'regular');
            parsedData.matches = parsedData.matches.concat(regularMatches);
            console.log(`Parsed ${regularMatches.length} regular season matches`);
        } catch (error) {
            console.error('Error parsing regular season matches:', error);
            parsedData.errors.push(`Regular season parsing error: ${error.message}`);
        }
    }
    
    // Parse playoff matches if available
    if (fetchResult.playoff) {
        try {
            const playoffMatches = parser.parseMatches(fetchResult.playoff, 'playoff');
            parsedData.matches = parsedData.matches.concat(playoffMatches);
            console.log(`Parsed ${playoffMatches.length} playoff matches`);
        } catch (error) {
            console.error('Error parsing playoff matches:', error);
            parsedData.warnings.push(`Playoff parsing error: ${error.message}`);
        }
    }
    
    return parsedData;
}

/**
 * Convert parsed data to tab-separated format for existing processScores function
 * @param {Object} parsedData - The parsed data object
 * @returns {string} Tab-separated string ready for processScores
 */
function convertParsedDataToTabFormat(parsedData) {
    if (!parsedData || !parsedData.matches || parsedData.matches.length === 0) {
        console.warn('No match data to convert');
        return '';
    }
    
    try {
        const parser = getHtmlDataParser();
        if (!parser) {
            throw new Error('HTML data parser not available');
        }
        
        // Use the parser's conversion method
        return parser.convertMatchesToTabFormat(parsedData.matches);
        
    } catch (error) {
        console.error('Error converting parsed data to tab format:', error);
        throw error;
    }
}

/**
 * Display data fetching error with fallback options
 * @param {string} divisionName - The division name
 * @param {Error} error - The error that occurred
 */
function displayDataFetchingError(divisionName, error) {
    let errorMessage = `Failed to load data for ${divisionName}: ${error.message}`;
    
    // Add specific guidance based on error type
    if (error.type === 'network') {
        errorMessage += '\n\nPlease check your internet connection and try again.';
    } else if (error.type === 'timeout') {
        errorMessage += '\n\nThe request timed out. The server may be slow or unavailable.';
    } else if (error.type === 'http') {
        errorMessage += '\n\nThe server returned an error. The data source may be temporarily unavailable.';
    }
    
    // Check if we have partial data that could be used
    if (error.fetchResult && hasUsablePartialData(error.fetchResult)) {
        errorMessage += '\n\nSome data was retrieved successfully. ';
        addRetryWithPartialDataOption(divisionName, error.fetchResult);
    } else {
        errorMessage += '\n\n';
        addRetryOption(divisionName);
    }
    
    errorMessage += 'You can also enter match data manually in the text area below.';
    
    // Display the error message
    setError(errorMessage);
    
    // Log additional details for debugging
    if (error.fetchResult) {
        console.log('Partial fetch result:', error.fetchResult);
    }
}

/**
 * Check if partial fetch result has usable data
 * @param {Object} fetchResult - The partial fetch result
 * @returns {boolean} True if there's usable data
 */
function hasUsablePartialData(fetchResult) {
    if (!fetchResult) return false;
    
    // Check if we have either standings or regular season data
    return !!(fetchResult.standings || fetchResult.regular);
}

/**
 * Add retry option to the error display
 * @param {string} divisionName - The division name to retry
 */
function addRetryOption(divisionName) {
    // Create retry button
    const retryButton = $('<button>')
        .text('Retry Data Loading')
        .css({
            'background': '#007bff',
            'color': 'white',
            'border': 'none',
            'padding': '6px 12px',
            'border-radius': '4px',
            'cursor': 'pointer',
            'margin': '5px 5px 5px 0'
        })
        .on('click', function() {
            console.log(`Retrying data fetch for ${divisionName}`);
            triggerDivisionDataFetching(divisionName);
        });
    
    // Add button to error container
    $('#error').append('<br>').append(retryButton);
}

/**
 * Add retry option with partial data processing
 * @param {string} divisionName - The division name
 * @param {Object} partialFetchResult - The partial fetch result
 */
function addRetryWithPartialDataOption(divisionName, partialFetchResult) {
    // Create retry button for full data
    const retryButton = $('<button>')
        .text('Retry Full Data Loading')
        .css({
            'background': '#007bff',
            'color': 'white',
            'border': 'none',
            'padding': '6px 12px',
            'border-radius': '4px',
            'cursor': 'pointer',
            'margin': '5px 5px 5px 0'
        })
        .on('click', function() {
            console.log(`Retrying full data fetch for ${divisionName}`);
            triggerDivisionDataFetching(divisionName);
        });
    
    // Create button to use partial data
    const usePartialButton = $('<button>')
        .text('Use Available Data')
        .css({
            'background': '#28a745',
            'color': 'white',
            'border': 'none',
            'padding': '6px 12px',
            'border-radius': '4px',
            'cursor': 'pointer',
            'margin': '5px 5px 5px 0'
        })
        .on('click', function() {
            console.log(`Using partial data for ${divisionName}`);
            processPartialFetchResult(divisionName, partialFetchResult);
        });
    
    // Add buttons to error container
    $('#error').append('<br>').append(retryButton).append(usePartialButton);
}

/**
 * Process partial fetch result when user chooses to use available data
 * @param {string} divisionName - The division name
 * @param {Object} partialFetchResult - The partial fetch result
 */
function processPartialFetchResult(divisionName, partialFetchResult) {
    console.log(`Processing partial data for ${divisionName}:`, partialFetchResult);
    
    try {
        // Clear the error display
        clearError();
        
        // Show loading state
        showDivisionStatus('Processing available data...', 'loading');
        
        // Process the partial data
        processAjaxFetchedData(partialFetchResult);
        
        // Update status to show partial success
        showDivisionStatus(`${divisionName} partial data loaded`, 'success');
        
        // Show warning about missing data
        const missingData = [];
        if (!partialFetchResult.standings) missingData.push('standings');
        if (!partialFetchResult.regular) missingData.push('regular season');
        if (!partialFetchResult.playoff) missingData.push('playoffs');
        
        if (missingData.length > 0) {
            setError(`Note: ${missingData.join(', ')} data could not be loaded. The analysis may be incomplete.`);
        }
        
    } catch (error) {
        console.error('Error processing partial data:', error);
        showDivisionStatus(`Failed to process ${divisionName} data`, 'error');
        setError(`Error processing available data: ${error.message}. Please try manual data entry.`);
    }
}

/**
 * Handle scenarios where some data sources fail but others succeed
 * @param {Object} fetchResult - The fetch result with mixed success/failure
 */
function handlePartialDataScenarios(fetchResult) {
    const hasStandings = !!fetchResult.standings;
    const hasRegular = !!fetchResult.regular;
    const hasPlayoff = !!fetchResult.playoff;
    
    console.log('Handling partial data scenario:', {
        standings: hasStandings,
        regular: hasRegular,
        playoff: hasPlayoff
    });
    
    // Determine if we can proceed with available data
    if (hasRegular || hasStandings) {
        // We have enough data to provide some functionality
        processAjaxFetchedData(fetchResult);
        
        // Show warnings about missing data
        const warnings = [];
        if (!hasStandings) warnings.push('Team standings data unavailable');
        if (!hasRegular) warnings.push('Regular season matches unavailable');
        if (!hasPlayoff) warnings.push('Playoff matches unavailable');
        
        if (warnings.length > 0) {
            const warningMessage = `Data loaded with limitations: ${warnings.join(', ')}. Analysis may be incomplete.`;
            console.warn(warningMessage);
            
            // Show warning to user but don't block functionality
            setTimeout(() => {
                if ($('#error').text().trim() === '') {
                    setError(warningMessage);
                }
            }, 1000);
        }
        
        return true;
    } else {
        // Not enough data to proceed
        return false;
    }
}

/**
 * Enhanced error handling for different failure scenarios
 * @param {string} divisionName - The division name
 * @param {Error} error - The error that occurred
 */
function handleDataFetchingError(divisionName, error) {
    console.error(`Data fetching failed for ${divisionName}:`, error);
    
    // Update UI to show error
    showDivisionStatus(`Failed to load ${divisionName} data`, 'error');
    enableDivisionSelector();
    
    // Check if this is a partial failure with some usable data
    if (error.fetchResult && hasUsablePartialData(error.fetchResult)) {
        console.log('Partial data available, attempting to use it...');
        
        if (handlePartialDataScenarios(error.fetchResult)) {
            // Partial data was successfully processed
            showDivisionStatus(`${divisionName} partial data loaded`, 'success');
            return;
        }
    }
    
    // Show error message to user with fallback options
    displayDataFetchingError(divisionName, error);
}

/**
 * Provide manual data entry guidance for specific divisions
 * @param {string} divisionName - The division name
 */
function provideManualDataEntryGuidance(divisionName) {
    const urls = getDivisionUrls(divisionName);
    if (!urls) {
        return;
    }
    
    // Create helpful guidance message
    let guidanceMessage = `To manually enter data for ${divisionName}:\n\n`;
    guidanceMessage += `1. Visit the regular season page: ${urls.regular}\n`;
    guidanceMessage += `2. Copy the match data and paste it in the text area below\n`;
    guidanceMessage += `3. Click "Load Scores" to process the data\n\n`;
    
    if (urls.playoff) {
        guidanceMessage += `For playoff data, also visit: ${urls.playoff}\n`;
    }
    
    console.log(guidanceMessage);
    
    // Update external link to point to the correct division
    updateExternalLink(divisionName);
}

/**
 * Check network connectivity and provide appropriate feedback
 * @returns {Promise<boolean>} Promise resolving to true if network is available
 */
function checkNetworkConnectivity() {
    return new Promise((resolve) => {
        // Simple connectivity check using a lightweight request
        const testUrl = 'https://httpbin.org/get';
        const ajaxManager = getAjaxDataManager();
        
        if (!ajaxManager) {
            resolve(false);
            return;
        }
        
        const proxyUrl = ajaxManager.constructProxyUrl(testUrl);
        if (!proxyUrl) {
            resolve(false);
            return;
        }
        
        // Make a quick test request with short timeout
        const xhr = new XMLHttpRequest();
        const timeout = setTimeout(() => {
            xhr.abort();
            resolve(false);
        }, 5000); // 5 second timeout for connectivity check
        
        xhr.onreadystatechange = () => {
            if (xhr.readyState === XMLHttpRequest.DONE) {
                clearTimeout(timeout);
                resolve(xhr.status >= 200 && xhr.status < 300);
            }
        };
        
        xhr.onerror = () => {
            clearTimeout(timeout);
            resolve(false);
        };
        
        try {
            xhr.open('GET', proxyUrl, true);
            xhr.send();
        } catch (error) {
            clearTimeout(timeout);
            resolve(false);
        }
    });
}

/**
 * Validate division configuration before attempting data fetch
 * @param {string} divisionName - The division name to validate
 * @returns {Object} Validation result with details
 */
function validateDivisionForDataFetch(divisionName) {
    const validation = {
        isValid: false,
        errors: [],
        warnings: []
    };
    
    // Check if division exists
    if (!divisionExists(divisionName)) {
        validation.errors.push(`Division "${divisionName}" not found in configuration`);
        return validation;
    }
    
    // Check if URLs are configured
    const urls = getDivisionUrls(divisionName);
    if (!urls) {
        validation.errors.push(`No URLs configured for division "${divisionName}"`);
        return validation;
    }
    
    // Validate individual URLs
    if (!urls.standings) {
        validation.warnings.push('Standings URL not configured');
    }
    if (!urls.regular) {
        validation.errors.push('Regular season URL not configured');
    }
    if (!urls.playoff) {
        validation.warnings.push('Playoff URL not configured');
    }
    
    // Check AJAX manager availability
    const ajaxManager = getAjaxDataManager();
    if (!ajaxManager) {
        validation.errors.push('AJAX data manager not initialized');
        return validation;
    }
    
    // Validate proxy URL construction
    try {
        const testProxyUrl = ajaxManager.constructProxyUrl(urls.regular);
        if (!testProxyUrl) {
            validation.errors.push('Failed to construct proxy URLs');
        }
    } catch (error) {
        validation.errors.push(`Proxy URL construction error: ${error.message}`);
    }
    
    validation.isValid = validation.errors.length === 0;
    return validation;
}

/****************************************
*
* Division Selector State Management Functions
*
*****************************************/

/**
 * Persist the selected division to localStorage
 * @param {string} divisionName - The division name to persist
 */
function persistDivisionSelection(divisionName) {
    try {
        localStorage.setItem(DIVISION_STORAGE_KEY, divisionName);
        console.log(`Persisted division selection: ${divisionName}`);
    } catch (error) {
        console.warn('Failed to persist division selection:', error);
    }
}

/**
 * Load persisted division selection from localStorage
 * @returns {string|null} The persisted division name or null if none found
 */
function loadPersistedDivisionSelection() {
    try {
        const persistedDivision = localStorage.getItem(DIVISION_STORAGE_KEY);
        
        if (persistedDivision && divisionExists(persistedDivision)) {
            console.log(`Loading persisted division: ${persistedDivision}`);
            
            // Set the selector value
            $('#divisionSelector').val(persistedDivision);
            
            // Trigger the selection change
            handleDivisionSelectionChange(persistedDivision);
            
            return persistedDivision;
        } else if (persistedDivision) {
            console.warn(`Persisted division "${persistedDivision}" no longer exists, clearing`);
            clearPersistedDivisionSelection();
        }
    } catch (error) {
        console.warn('Failed to load persisted division selection:', error);
    }
    
    return null;
}

/**
 * Clear persisted division selection from localStorage
 */
function clearPersistedDivisionSelection() {
    try {
        localStorage.removeItem(DIVISION_STORAGE_KEY);
        console.log('Cleared persisted division selection');
    } catch (error) {
        console.warn('Failed to clear persisted division selection:', error);
    }
}

/**
 * Get the currently persisted division without loading it
 * @returns {string|null} The persisted division name or null if none found
 */
function getPersistedDivisionSelection() {
    try {
        return localStorage.getItem(DIVISION_STORAGE_KEY);
    } catch (error) {
        console.warn('Failed to get persisted division selection:', error);
        return null;
    }
}

/****************************************
*
* Division Selector UI Helper Functions
*
*****************************************/

/**
 * Show status message for division selector
 * @param {string} message - The status message to display
 * @param {string} type - The status type: 'loading', 'success', 'error'
 */
function showDivisionStatus(message, type) {
    const statusElement = $('#divisionStatus');
    
    // Clear existing classes
    statusElement.removeClass('loading success error');
    
    // Add new class and message
    if (type && ['loading', 'success', 'error'].indexOf(type) !== -1) {
        statusElement.addClass(type);
    }
    
    statusElement.text(message);
}

/**
 * Clear division status message
 */
function clearDivisionStatus() {
    const statusElement = $('#divisionStatus');
    statusElement.removeClass('loading success error');
    statusElement.text('');
}

/**
 * Disable the division selector dropdown
 */
function disableDivisionSelector() {
    $('#divisionSelector').prop('disabled', true);
}

/**
 * Enable the division selector dropdown
 */
function enableDivisionSelector() {
    $('#divisionSelector').prop('disabled', false);
}

/**
 * Reset division selector to empty selection
 */
function resetDivisionSelector() {
    $('#divisionSelector').val('');
}

/**
 * Get the currently selected division from the UI
 * @returns {string} The selected division name or empty string if none selected
 */
function getSelectedDivisionFromUI() {
    return $('#divisionSelector').val() || '';
}

/**
 * Set the division selector UI to a specific division
 * @param {string} divisionName - The division name to select
 * @returns {boolean} True if successfully set, false otherwise
 */
function setDivisionSelectorUI(divisionName) {
    if (!divisionName || !divisionExists(divisionName)) {
        return false;
    }
    
    $('#divisionSelector').val(divisionName);
    return true;
}

/**
 * Check if the division selector is initialized
 * @returns {boolean} True if initialized, false otherwise
 */
function isDivisionSelectorInitialized() {
    return _divisionSelectorInitialized;
}

/**
 * Get division selector state summary for debugging
 * @returns {Object} Summary of division selector state
 */
function getDivisionSelectorState() {
    return {
        initialized: _divisionSelectorInitialized,
        currentDivision: getCurrentDivision(),
        selectedInUI: getSelectedDivisionFromUI(),
        persistedDivision: getPersistedDivisionSelection(),
        isEnabled: !$('#divisionSelector').prop('disabled'),
        availableDivisions: getAvailableDivisions()
    };
}

/****************************************
*
* AJAX Data Manager for Proxy Requests
*
*****************************************/

/**
 * AJAX Data Manager Class
 * Handles all AJAX requests through the Cloudflare proxy with proper error handling and retry logic
 */
class AjaxDataManager {
    constructor(divisionConfig) {
        this.divisionConfig = divisionConfig;
        this.requestTimeout = 30000; // 30 seconds
        this.maxRetries = 2;
        this.retryDelay = 1000; // 1 second base delay
    }

    /**
     * Make an AJAX request with timeout and retry logic
     * @param {string} url - The URL to request
     * @param {number} retryCount - Current retry attempt (internal use)
     * @returns {Promise<string>} Promise resolving to HTML response string
     */
    makeAjaxRequest(url, retryCount = 0) {
        return new Promise((resolve, reject) => {
            if (!url) {
                reject(new Error('URL is required for AJAX request'));
                return;
            }

            console.log(`Making AJAX request to: ${url} (attempt ${retryCount + 1})`);

            const xhr = new XMLHttpRequest();
            let timeoutId;

            // Set up timeout
            timeoutId = setTimeout(() => {
                xhr.abort();
                const timeoutError = new Error(`Request timeout after ${this.requestTimeout}ms`);
                timeoutError.type = 'timeout';
                
                // Retry logic for timeout
                if (retryCount < this.maxRetries) {
                    console.warn(`Request timed out, retrying in ${this.retryDelay * (retryCount + 1)}ms...`);
                    setTimeout(() => {
                        this.makeAjaxRequest(url, retryCount + 1)
                            .then(resolve)
                            .catch(reject);
                    }, this.retryDelay * (retryCount + 1));
                } else {
                    reject(timeoutError);
                }
            }, this.requestTimeout);

            xhr.onreadystatechange = () => {
                if (xhr.readyState === XMLHttpRequest.DONE) {
                    clearTimeout(timeoutId);
                    
                    if (xhr.status >= 200 && xhr.status < 300) {
                        console.log(`AJAX request successful: ${xhr.status}`);
                        resolve(xhr.responseText);
                    } else {
                        const httpError = new Error(`HTTP ${xhr.status}: ${xhr.statusText}`);
                        httpError.type = 'http';
                        httpError.status = xhr.status;
                        
                        // Retry logic for certain HTTP errors
                        if (retryCount < this.maxRetries && (xhr.status >= 500 || xhr.status === 0)) {
                            console.warn(`HTTP error ${xhr.status}, retrying in ${this.retryDelay * (retryCount + 1)}ms...`);
                            setTimeout(() => {
                                this.makeAjaxRequest(url, retryCount + 1)
                                    .then(resolve)
                                    .catch(reject);
                            }, this.retryDelay * (retryCount + 1));
                        } else {
                            reject(httpError);
                        }
                    }
                }
            };

            xhr.onerror = () => {
                clearTimeout(timeoutId);
                const networkError = new Error('Network error occurred');
                networkError.type = 'network';
                
                // Retry logic for network errors
                if (retryCount < this.maxRetries) {
                    console.warn(`Network error, retrying in ${this.retryDelay * (retryCount + 1)}ms...`);
                    setTimeout(() => {
                        this.makeAjaxRequest(url, retryCount + 1)
                            .then(resolve)
                            .catch(reject);
                    }, this.retryDelay * (retryCount + 1));
                } else {
                    reject(networkError);
                }
            };

            xhr.onabort = () => {
                clearTimeout(timeoutId);
                const abortError = new Error('Request was aborted');
                abortError.type = 'abort';
                reject(abortError);
            };

            try {
                xhr.open('GET', url, true);
                xhr.send();
            } catch (error) {
                clearTimeout(timeoutId);
                reject(error);
            }
        });
    }

    /**
     * Construct proxy URL for a given target URL
     * @param {string} targetUrl - The target URL to proxy
     * @returns {string|null} Constructed proxy URL or null if invalid
     */
    constructProxyUrl(targetUrl) {
        if (!this.divisionConfig) {
            console.error('Division configuration not available');
            return null;
        }
        
        return this.divisionConfig.constructProxyUrl(targetUrl);
    }

    /**
     * Validate that a division exists and has required URLs
     * @param {string} divisionName - Name of the division to validate
     * @returns {boolean} True if division is valid for AJAX requests
     */
    validateDivisionForAjax(divisionName) {
        if (!divisionName || !this.divisionConfig) {
            return false;
        }

        const validation = this.divisionConfig.validateConfiguration(divisionName);
        return validation.isValid;
    }

    /**
     * Get division URLs for AJAX requests
     * @param {string} divisionName - Name of the division
     * @returns {Object|null} Division URLs or null if not found/invalid
     */
    getDivisionUrlsForAjax(divisionName) {
        if (!this.validateDivisionForAjax(divisionName)) {
            return null;
        }

        return this.divisionConfig.getDivisionUrls(divisionName);
    }

    /**
     * Fetch standings data for a specific division
     * @param {string} divisionName - Name of the division
     * @returns {Promise<string>} Promise resolving to HTML response containing standings data
     */
    fetchStandings(divisionName) {
        console.log(`Fetching standings data for division: ${divisionName}`);
        
        const urls = this.getDivisionUrlsForAjax(divisionName);
        if (!urls || !urls.standings) {
            return Promise.reject(new Error(`Standings URL not found for division: ${divisionName}`));
        }

        const proxyUrl = this.constructProxyUrl(urls.standings);
        if (!proxyUrl) {
            return Promise.reject(new Error(`Failed to construct proxy URL for standings: ${urls.standings}`));
        }

        return this.makeAjaxRequest(proxyUrl)
            .then(response => {
                console.log(`Successfully fetched standings data for ${divisionName} (${response.length} characters)`);
                return response;
            })
            .catch(error => {
                console.error(`Failed to fetch standings for ${divisionName}:`, error);
                throw error;
            });
    }

    /**
     * Fetch regular season match data for a specific division
     * @param {string} divisionName - Name of the division
     * @returns {Promise<string>} Promise resolving to HTML response containing regular season matches
     */
    fetchRegularSeason(divisionName) {
        console.log(`Fetching regular season data for division: ${divisionName}`);
        
        const urls = this.getDivisionUrlsForAjax(divisionName);
        if (!urls || !urls.regular) {
            return Promise.reject(new Error(`Regular season URL not found for division: ${divisionName}`));
        }

        const proxyUrl = this.constructProxyUrl(urls.regular);
        if (!proxyUrl) {
            return Promise.reject(new Error(`Failed to construct proxy URL for regular season: ${urls.regular}`));
        }

        return this.makeAjaxRequest(proxyUrl)
            .then(response => {
                console.log(`Successfully fetched regular season data for ${divisionName} (${response.length} characters)`);
                return response;
            })
            .catch(error => {
                console.error(`Failed to fetch regular season data for ${divisionName}:`, error);
                throw error;
            });
    }

    /**
     * Fetch playoff match data for a specific division
     * @param {string} divisionName - Name of the division
     * @returns {Promise<string>} Promise resolving to HTML response containing playoff matches
     */
    fetchPlayoffs(divisionName) {
        console.log(`Fetching playoff data for division: ${divisionName}`);
        
        const urls = this.getDivisionUrlsForAjax(divisionName);
        if (!urls || !urls.playoff) {
            return Promise.reject(new Error(`Playoff URL not found for division: ${divisionName}`));
        }

        const proxyUrl = this.constructProxyUrl(urls.playoff);
        if (!proxyUrl) {
            return Promise.reject(new Error(`Failed to construct proxy URL for playoffs: ${urls.playoff}`));
        }

        return this.makeAjaxRequest(proxyUrl)
            .then(response => {
                console.log(`Successfully fetched playoff data for ${divisionName} (${response.length} characters)`);
                return response;
            })
            .catch(error => {
                console.error(`Failed to fetch playoff data for ${divisionName}:`, error);
                throw error;
            });
    }

    /**
     * Fetch all data sources for a division (standings, regular season, playoffs)
     * @param {string} divisionName - Name of the division
     * @returns {Promise<Object>} Promise resolving to object with all three data sources
     */
    fetchAllData(divisionName) {
        console.log(`Fetching all data for division: ${divisionName}`);
        
        if (!this.validateDivisionForAjax(divisionName)) {
            return Promise.reject(new Error(`Invalid division for AJAX requests: ${divisionName}`));
        }

        // Start all three requests simultaneously for better performance
        const standingsPromise = this.fetchStandings(divisionName);
        const regularSeasonPromise = this.fetchRegularSeason(divisionName);
        const playoffsPromise = this.fetchPlayoffs(divisionName);

        // Use Promise.allSettled to handle partial failures gracefully
        return Promise.allSettled([standingsPromise, regularSeasonPromise, playoffsPromise])
            .then(results => {
                const [standingsResult, regularResult, playoffResult] = results;
                
                const fetchResult = {
                    divisionName: divisionName,
                    standings: null,
                    regular: null,
                    playoff: null,
                    errors: [],
                    warnings: []
                };

                // Process standings result
                if (standingsResult.status === 'fulfilled') {
                    fetchResult.standings = standingsResult.value;
                } else {
                    fetchResult.errors.push(`Standings: ${standingsResult.reason.message}`);
                }

                // Process regular season result
                if (regularResult.status === 'fulfilled') {
                    fetchResult.regular = regularResult.value;
                } else {
                    fetchResult.errors.push(`Regular season: ${regularResult.reason.message}`);
                }

                // Process playoff result (this is optional, so treat failure as warning)
                if (playoffResult.status === 'fulfilled') {
                    fetchResult.playoff = playoffResult.value;
                } else {
                    fetchResult.warnings.push(`Playoffs: ${playoffResult.reason.message}`);
                }

                // Determine if we have enough data to proceed
                const hasStandings = fetchResult.standings !== null;
                const hasRegular = fetchResult.regular !== null;
                
                if (!hasStandings && !hasRegular) {
                    // Both critical data sources failed
                    const error = new Error(`Failed to fetch critical data for ${divisionName}: ${fetchResult.errors.join(', ')}`);
                    error.fetchResult = fetchResult;
                    throw error;
                } else if (!hasStandings || !hasRegular) {
                    // One critical source failed, but we can continue
                    console.warn(`Partial data fetch for ${divisionName}:`, fetchResult.errors);
                }

                if (fetchResult.warnings.length > 0) {
                    console.warn(`Data fetch warnings for ${divisionName}:`, fetchResult.warnings);
                }

                console.log(`Successfully fetched data for ${divisionName}:`, {
                    standings: hasStandings,
                    regular: hasRegular,
                    playoff: fetchResult.playoff !== null
                });

                return fetchResult;
            });
    }
}

/**
 * Core AJAX functionality utility functions
 */

/**
 * Create a new AJAX data manager instance
 * @returns {AjaxDataManager} New AJAX data manager instance
 */
function createAjaxDataManager() {
    return new AjaxDataManager(_divisionConfigManager);
}

/**
 * Test AJAX functionality with a simple request
 * @param {string} testUrl - URL to test (will be proxied)
 * @returns {Promise<Object>} Test result object
 */
function testAjaxFunctionality(testUrl) {
    console.log('=== AJAX Functionality Test ===');
    
    const ajaxManager = createAjaxDataManager();
    
    if (!testUrl) {
        // Use a simple test URL if none provided
        testUrl = 'https://httpbin.org/get';
    }
    
    const proxyUrl = ajaxManager.constructProxyUrl(testUrl);
    
    if (!proxyUrl) {
        return Promise.reject(new Error('Failed to construct proxy URL'));
    }
    
    console.log(`Testing AJAX request to: ${proxyUrl}`);
    
    return ajaxManager.makeAjaxRequest(proxyUrl)
        .then(response => {
            console.log('AJAX test successful');
            return {
                success: true,
                originalUrl: testUrl,
                proxyUrl: proxyUrl,
                responseLength: response.length,
                responsePreview: response.substring(0, 200) + (response.length > 200 ? '...' : '')
            };
        })
        .catch(error => {
            console.error('AJAX test failed:', error);
            return {
                success: false,
                originalUrl: testUrl,
                proxyUrl: proxyUrl,
                error: error.message,
                errorType: error.type || 'unknown'
            };
        });
}

/**
 * Validate AJAX configuration and dependencies
 * @returns {Object} Validation result with details
 */
function validateAjaxConfiguration() {
    const validation = {
        isValid: true,
        errors: [],
        warnings: []
    };

    // Check if division configuration is available
    if (!_divisionConfigManager) {
        validation.isValid = false;
        validation.errors.push('Division configuration manager not available');
    } else {
        // Validate division configuration
        const divisionValidation = _divisionConfigManager.validateConfiguration();
        if (!divisionValidation.isValid) {
            validation.isValid = false;
            validation.errors.push('Division configuration invalid: ' + divisionValidation.errors.join(', '));
        }
    }

    // Check if XMLHttpRequest is available
    if (typeof XMLHttpRequest === 'undefined') {
        validation.isValid = false;
        validation.errors.push('XMLHttpRequest not available in this environment');
    }

    // Check if Promise is available
    if (typeof Promise === 'undefined') {
        validation.isValid = false;
        validation.errors.push('Promise not available in this environment');
    }

    // Warnings for potential issues
    if (typeof console === 'undefined') {
        validation.warnings.push('Console not available - logging will not work');
    }

    return validation;
}

// Global AJAX data manager instance
let _ajaxDataManager = null;

/**
 * Initialize global AJAX data manager
 * @returns {boolean} True if initialization successful
 */
function initializeAjaxDataManager() {
    console.log('Initializing AJAX data manager...');
    
    // Validate configuration first
    const validation = validateAjaxConfiguration();
    if (!validation.isValid) {
        console.error('AJAX configuration validation failed:', validation.errors);
        return false;
    }
    
    if (validation.warnings.length > 0) {
        console.warn('AJAX configuration warnings:', validation.warnings);
    }
    
    // Create global instance
    _ajaxDataManager = createAjaxDataManager();
    
    console.log('AJAX data manager initialized successfully');
    return true;
}

/**
 * Get the global AJAX data manager instance
 * @returns {AjaxDataManager|null} Global AJAX data manager or null if not initialized
 */
function getAjaxDataManager() {
    return _ajaxDataManager;
}

/**
 * Fetch standings data for the current division
 * @returns {Promise<string>} Promise resolving to HTML response containing standings data
 */
function fetchCurrentDivisionStandings() {
    const currentDivision = getCurrentDivision();
    if (!currentDivision) {
        return Promise.reject(new Error('No division currently selected'));
    }

    const ajaxManager = getAjaxDataManager();
    if (!ajaxManager) {
        return Promise.reject(new Error('AJAX data manager not initialized'));
    }

    return ajaxManager.fetchStandings(currentDivision);
}

/**
 * Fetch regular season data for the current division
 * @returns {Promise<string>} Promise resolving to HTML response containing regular season matches
 */
function fetchCurrentDivisionRegularSeason() {
    const currentDivision = getCurrentDivision();
    if (!currentDivision) {
        return Promise.reject(new Error('No division currently selected'));
    }

    const ajaxManager = getAjaxDataManager();
    if (!ajaxManager) {
        return Promise.reject(new Error('AJAX data manager not initialized'));
    }

    return ajaxManager.fetchRegularSeason(currentDivision);
}

/**
 * Fetch playoff data for the current division
 * @returns {Promise<string>} Promise resolving to HTML response containing playoff matches
 */
function fetchCurrentDivisionPlayoffs() {
    const currentDivision = getCurrentDivision();
    if (!currentDivision) {
        return Promise.reject(new Error('No division currently selected'));
    }

    const ajaxManager = getAjaxDataManager();
    if (!ajaxManager) {
        return Promise.reject(new Error('AJAX data manager not initialized'));
    }

    return ajaxManager.fetchPlayoffs(currentDivision);
}

/**
 * Fetch all data for the current division
 * @returns {Promise<Object>} Promise resolving to object with all three data sources
 */
function fetchCurrentDivisionAllData() {
    const currentDivision = getCurrentDivision();
    if (!currentDivision) {
        return Promise.reject(new Error('No division currently selected'));
    }

    const ajaxManager = getAjaxDataManager();
    if (!ajaxManager) {
        return Promise.reject(new Error('AJAX data manager not initialized'));
    }

    return ajaxManager.fetchAllData(currentDivision);
}

/**
 * Test data fetching for a specific division
 * @param {string} divisionName - Name of the division to test (optional, uses current if not provided)
 * @returns {Promise<Object>} Test result object
 */
function testDataFetching(divisionName) {
    console.log('=== Data Fetching Test ===');
    
    const testDivision = divisionName || getCurrentDivision();
    if (!testDivision) {
        return Promise.reject(new Error('No division specified and no current division selected'));
    }

    const ajaxManager = getAjaxDataManager();
    if (!ajaxManager) {
        return Promise.reject(new Error('AJAX data manager not initialized'));
    }

    console.log(`Testing data fetching for division: ${testDivision}`);
    
    return ajaxManager.fetchAllData(testDivision)
        .then(result => {
            console.log('Data fetching test completed successfully');
            return {
                success: true,
                division: testDivision,
                standingsLength: result.standings ? result.standings.length : 0,
                regularSeasonLength: result.regular ? result.regular.length : 0,
                playoffLength: result.playoff ? result.playoff.length : 0,
                errors: result.errors,
                warnings: result.warnings
            };
        })
        .catch(error => {
            console.error('Data fetching test failed:', error);
            return {
                success: false,
                division: testDivision,
                error: error.message,
                fetchResult: error.fetchResult || null
            };
        });
}

/****************************************
*
* Mermaid Integration Manager
*
*****************************************/

/**
 * Mermaid Integration Manager Class
 * Manages Mermaid library integration and graph rendering
 */
class MermaidManager {
    constructor() {
        this.isInitialized = false;
        this.renderingEnabled = false;
    }

    /**
     * Initialize Mermaid library with appropriate configuration
     * @returns {boolean} True if initialization successful
     */
    initialize() {
        console.log('Initializing Mermaid.js library...');
        
        // Check if Mermaid is available
        if (typeof mermaid === 'undefined') {
            console.error('Mermaid library not loaded');
            return false;
        }

        try {
            // Configure Mermaid with appropriate settings
            mermaid.initialize({
                startOnLoad: false, // We'll manually trigger rendering
                theme: 'default',
                securityLevel: 'loose', // Allow HTML in labels
                flowchart: {
                    useMaxWidth: true,
                    htmlLabels: true,
                    curve: 'basis'
                },
                themeVariables: {
                    primaryColor: '#007bff',
                    primaryTextColor: '#333',
                    primaryBorderColor: '#007bff',
                    lineColor: '#666',
                    secondaryColor: '#f8f9fa',
                    tertiaryColor: '#e9ecef'
                }
            });

            this.isInitialized = true;
            this.renderingEnabled = true;
            console.log('Mermaid.js initialized successfully');
            return true;

        } catch (error) {
            console.error('Error initializing Mermaid:', error);
            this.isInitialized = false;
            this.renderingEnabled = false;
            return false;
        }
    }

    /**
     * Render Mermaid code as visual diagram
     * @param {string} mermaidCode - The Mermaid diagram code to render
     * @returns {Promise<boolean>} Promise resolving to true if rendering successful
     */
    renderGraph(mermaidCode) {
        if (!this.isInitialized || !this.renderingEnabled) {
            console.warn('Mermaid not initialized or rendering disabled');
            return Promise.resolve(false);
        }

        if (!mermaidCode || typeof mermaidCode !== 'string') {
            console.warn('Invalid Mermaid code provided for rendering');
            return Promise.resolve(false);
        }

        return new Promise((resolve) => {
            try {
                // Clear previous rendered content
                const container = document.getElementById('renderedGraph');
                if (!container) {
                    console.error('Rendered graph container not found');
                    resolve(false);
                    return;
                }

                // Generate unique ID for this render
                const graphId = 'mermaid-graph-' + Date.now();
                
                // Use Mermaid's render method
                mermaid.render(graphId, mermaidCode)
                    .then((result) => {
                        // Insert the rendered SVG into the container
                        container.innerHTML = result.svg;
                        
                        // Show the rendered graph container
                        this.showRenderedContainer();
                        
                        console.log('Mermaid graph rendered successfully');
                        resolve(true);
                    })
                    .catch((error) => {
                        console.error('Mermaid rendering error:', error);
                        this.handleRenderingError(error);
                        resolve(false);
                    });

            } catch (error) {
                console.error('Error during Mermaid rendering:', error);
                this.handleRenderingError(error);
                resolve(false);
            }
        });
    }

    /**
     * Update rendered graph when data changes
     * @param {string} newMermaidCode - Updated Mermaid code
     * @returns {Promise<boolean>} Promise resolving to true if update successful
     */
    updateRenderedGraph(newMermaidCode) {
        console.log('Updating rendered Mermaid graph...');
        return this.renderGraph(newMermaidCode);
    }

    /**
     * Get the DOM element containing the rendered graph
     * @returns {HTMLElement|null} Rendered graph container element
     */
    getRenderedElement() {
        return document.getElementById('renderedGraph');
    }

    /**
     * Show the rendered graph container
     */
    showRenderedContainer() {
        const container = document.getElementById('renderedGraphContainer');
        if (container) {
            container.style.display = 'block';
        }
    }

    /**
     * Hide the rendered graph container
     */
    hideRenderedContainer() {
        const container = document.getElementById('renderedGraphContainer');
        if (container) {
            container.style.display = 'none';
        }
    }

    /**
     * Handle rendering errors gracefully
     * @param {Error} error - The rendering error
     */
    handleRenderingError(error) {
        console.error('Mermaid rendering failed:', error);
        
        // Hide the rendered container on error
        this.hideRenderedContainer();
        
        // Optionally show error message to user
        const container = document.getElementById('renderedGraph');
        if (container) {
            container.innerHTML = '<div style="color: #dc3545; padding: 10px; border: 1px solid #dc3545; border-radius: 4px; background: #f8d7da;">Graph rendering failed. Please check the Mermaid code syntax.</div>';
            this.showRenderedContainer();
        }
    }

    /**
     * Clear rendered graph content
     */
    clearRenderedGraph() {
        const container = document.getElementById('renderedGraph');
        if (container) {
            container.innerHTML = '';
        }
        this.hideRenderedContainer();
    }

    /**
     * Check if Mermaid is properly initialized
     * @returns {boolean} True if initialized and ready for rendering
     */
    isReady() {
        return this.isInitialized && this.renderingEnabled;
    }

    /**
     * Enable or disable rendering
     * @param {boolean} enabled - Whether to enable rendering
     */
    setRenderingEnabled(enabled) {
        this.renderingEnabled = enabled;
        console.log(`Mermaid rendering ${enabled ? 'enabled' : 'disabled'}`);
    }
}

// Global Mermaid manager instance
let _mermaidManager = null;

/**
 * Initialize global Mermaid manager
 * @returns {boolean} True if initialization successful
 */
function initializeMermaid() {
    console.log('Setting up Mermaid integration...');
    
    // Create global Mermaid manager instance
    _mermaidManager = new MermaidManager();
    
    // Initialize Mermaid
    const initResult = _mermaidManager.initialize();
    
    if (initResult) {
        console.log('Mermaid integration ready');
        console.log('Available Mermaid functions:');
        console.log('  - renderMermaidGraph(code): Render Mermaid code as visual graph');
        console.log('  - clearRenderedGraph(): Clear rendered graph display');
        console.log('  - isMermaidReady(): Check if Mermaid is ready for rendering');
    } else {
        console.warn('Mermaid integration failed - graphs will show as raw code only');
    }
    
    return initResult;
}

/**
 * Get the global Mermaid manager instance
 * @returns {MermaidManager|null} Global Mermaid manager or null if not initialized
 */
function getMermaidManager() {
    return _mermaidManager;
}

/**
 * Render Mermaid code as visual diagram (public interface)
 * @param {string} mermaidCode - The Mermaid diagram code to render
 * @returns {Promise<boolean>} Promise resolving to true if rendering successful
 */
function renderMermaidGraph(mermaidCode) {
    const manager = getMermaidManager();
    if (!manager) {
        console.warn('Mermaid manager not initialized');
        return Promise.resolve(false);
    }
    
    return manager.renderGraph(mermaidCode);
}

/**
 * Clear rendered graph display (public interface)
 */
function clearRenderedGraph() {
    const manager = getMermaidManager();
    if (manager) {
        manager.clearRenderedGraph();
    }
}

/**
 * Check if Mermaid is ready for rendering (public interface)
 * @returns {boolean} True if Mermaid is ready
 */
function isMermaidReady() {
    const manager = getMermaidManager();
    return manager ? manager.isReady() : false;
}

/**
 * Update rendered graph when graph data changes (public interface)
 * @param {string} newMermaidCode - Updated Mermaid code
 * @returns {Promise<boolean>} Promise resolving to true if update successful
 */
function updateRenderedMermaidGraph(newMermaidCode) {
    const manager = getMermaidManager();
    if (!manager) {
        return Promise.resolve(false);
    }
    
    return manager.updateRenderedGraph(newMermaidCode);
}

/**
 * Synchronize rendered graph with current raw code display
 * Ensures both displays show the same content
 * @returns {Promise<boolean>} Promise resolving to true if synchronization successful
 */
function synchronizeGraphDisplays() {
    const rawCode = $('#graph').text();
    
    if (!rawCode || rawCode.trim().length === 0) {
        // No raw code to synchronize, clear rendered graph
        clearRenderedGraph();
        return Promise.resolve(true);
    }
    
    // Update rendered graph to match raw code
    return updateRenderedMermaidGraph(rawCode);
}

/**
 * Test Mermaid integration with a sample graph
 * @returns {Promise<boolean>} Promise resolving to true if test successful
 */
function testMermaidIntegration() {
    console.log('=== Testing Mermaid Integration ===');
    
    if (!isMermaidReady()) {
        console.error('Mermaid is not ready for testing');
        return Promise.resolve(false);
    }
    
    // Sample Mermaid graph code
    const testGraphCode = `graph TD
    A[Team A] -->|beats| B[Team B]
    B -->|beats| C[Team C]
    C -->|beats| A
    A -->|ties| D[Team D]
    B -->|ties| D
    C -->|beats| D`;
    
    console.log('Testing with sample graph code...');
    
    // Update raw code display
    $('#graph').html(testGraphCode);
    
    // Render the graph
    return renderMermaidGraph(testGraphCode)
        .then(success => {
            if (success) {
                console.log('✓ Mermaid integration test successful');
                console.log('✓ Graph rendered as visual diagram');
                console.log('✓ Raw code display maintained for copy functionality');
                return true;
            } else {
                console.error('✗ Mermaid rendering failed during test');
                return false;
            }
        })
        .catch(error => {
            console.error('✗ Mermaid integration test failed:', error);
            return false;
        });
}

/****************************************
*
* HTML Data Parser for Proxy Requests
*
*****************************************/

/**
 * HTML Data Parser Class
 * Extracts structured data from HTML responses using DOM parsing
 */
class HtmlDataParser {
    constructor() {
        // Initialize any parser configuration if needed
    }

    /**
     * Parse standings HTML to extract team names and referee points
     * Focuses on last two columns (Ref Current Points, Ref Potential Points)
     * @param {string} htmlString - HTML response containing standings table
     * @returns {Array} Array of objects with {team, currentPoints, potentialPoints}
     */
    parseStandings(htmlString) {
        console.log('Parsing standings data from HTML response...');
        
        if (!htmlString || typeof htmlString !== 'string') {
            console.error('Invalid HTML string provided for standings parsing');
            return [];
        }

        try {
            // Create a temporary DOM element to parse the HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlString;

            // Look for tables in the HTML
            const tables = tempDiv.querySelectorAll('table');
            
            if (tables.length === 0) {
                console.warn('No tables found in standings HTML');
                return [];
            }

            // Try each table to find the standings table
            for (let tableIndex = 0; tableIndex < tables.length; tableIndex++) {
                const table = tables[tableIndex];
                const result = this._parseStandingsTable(table);
                
                if (result.length > 0) {
                    console.log(`Successfully parsed ${result.length} teams from standings table ${tableIndex + 1}`);
                    return result;
                }
            }

            console.warn('No valid standings data found in any table');
            return [];

        } catch (error) {
            console.error('Error parsing standings HTML:', error);
            return [];
        }
    }

    /**
     * Parse a specific table for standings data
     * @private
     * @param {HTMLTableElement} table - The table element to parse
     * @returns {Array} Array of team standings objects
     */
    _parseStandingsTable(table) {
        const standings = [];
        
        try {
            const rows = table.querySelectorAll('tr');
            
            if (rows.length < 2) {
                // Need at least header + 1 data row
                return [];
            }

            // Find header row and identify column indices
            let headerRowIndex = -1;
            let teamNameColumnIndex = -1;
            let currentPointsColumnIndex = -1;
            let potentialPointsColumnIndex = -1;

            // Look for header row (usually first few rows)
            for (let i = 0; i < Math.min(3, rows.length); i++) {
                const headerCells = rows[i].querySelectorAll('th, td');
                const columnInfo = this._identifyStandingsColumns(headerCells);
                
                console.log("** standings columns", columnInfo, headerCells);

                if (columnInfo.isValid) {
                    headerRowIndex = i;
                    teamNameColumnIndex = columnInfo.teamNameIndex;
                    currentPointsColumnIndex = columnInfo.currentPointsIndex;
                    potentialPointsColumnIndex = columnInfo.potentialPointsIndex;
                    break;
                }
            }

            if (headerRowIndex === -1) {
                console.warn('Could not identify standings table columns');
                return [];
            }

            console.log(`Found standings columns - Team: ${teamNameColumnIndex}, Current: ${currentPointsColumnIndex}, Potential: ${potentialPointsColumnIndex}`);

            // Parse data rows
            for (let i = headerRowIndex + 1; i < rows.length; i++) {
                const cells = rows[i].querySelectorAll('td, th');
                
                if (cells.length <= Math.max(teamNameColumnIndex, currentPointsColumnIndex, potentialPointsColumnIndex)) {
                    continue; // Skip rows that don't have enough columns
                }

                const teamName = this._extractTeamName(cells[teamNameColumnIndex]);
                const currentPoints = this._extractPoints(cells[currentPointsColumnIndex]);
                const potentialPoints = this._extractPoints(cells[potentialPointsColumnIndex]);

                if (teamName && (currentPoints !== null || potentialPoints !== null)) {
                    standings.push({
                        team: teamName,
                        currentPoints: currentPoints,
                        potentialPoints: potentialPoints
                    });
                }
            }

            return standings;

        } catch (error) {
            console.error('Error parsing standings table:', error);
            return [];
        }
    }

    /**
     * Identify column indices for team name and referee points
     * @private
     * @param {NodeList} headerCells - Header cells from the table
     * @returns {Object} Object with column indices and validity flag
     */
    _identifyStandingsColumns(headerCells) {
        const result = {
            isValid: true,
            teamNameIndex: 1,
            currentPointsIndex: 7,
            potentialPointsIndex: 8
        };

        return result;

        if (!headerCells || headerCells.length < 3) {
            return result;
        }

        // Convert to array for easier processing
        const headers = Array.from(headerCells).map(cell => 
            (cell.textContent || '').trim().toLowerCase()
        );

        // Look for team name column (usually first few columns)
        const teamPatterns = ['Team'];
        for (let i = 0; i < Math.min(3, headers.length); i++) {
            const header = headers[i];
            if (teamPatterns.some(pattern => header.includes(pattern)) || 
                (i === 0 && header.length > 0)) { // First column with content
                result.teamNameIndex = i;
                break;
            }
        }

        // Look for referee points columns (usually last two columns)
        const currentPointsPatterns = ['Current'];
        const potentialPointsPatterns = ['Season'];

        // Search from the end of the table backwards
        for (let i = headers.length - 1; i >= 0; i--) {
            const header = headers[i];
            
            if (result.potentialPointsIndex === -1 && 
                potentialPointsPatterns.some(pattern => header.includes(pattern))) {
                result.potentialPointsIndex = i;
            } else if (result.currentPointsIndex === -1 && 
                       currentPointsPatterns.some(pattern => header.includes(pattern))) {
                result.currentPointsIndex = i;
            }
        }

        // If we didn't find specific patterns, try to use last two columns
        if (result.currentPointsIndex === -1 && result.potentialPointsIndex === -1 && headers.length >= 2) {
            result.currentPointsIndex = headers.length - 2;
            result.potentialPointsIndex = headers.length - 1;
        }

        // Validate that we found the essential columns
        result.isValid = (result.teamNameIndex !== -1 && 
                         (result.currentPointsIndex !== -1 || result.potentialPointsIndex !== -1));

        return result;
    }

    /**
     * Extract team name from table cell
     * @private
     * @param {HTMLElement} cell - Table cell containing team name
     * @returns {string|null} Cleaned team name or null if invalid
     */
    _extractTeamName(cell) {
        if (!cell) {
            return null;
        }

        let teamName = (cell.textContent || '').trim();
        
        // Remove common prefixes/suffixes and clean up
        teamName = teamName.replace(/^\d+\.?\s*/, ''); // Remove leading numbers
        teamName = teamName.replace(/\s+/g, ' '); // Normalize whitespace
        
        return teamName.length > 0 ? teamName : null;
    }

    /**
     * Extract points value from table cell
     * @private
     * @param {HTMLElement} cell - Table cell containing points
     * @returns {number|null} Points value or null if invalid
     */
    _extractPoints(cell) {
        if (!cell) {
            return null;
        }

        const pointsText = (cell.textContent || '').trim();
        
        // Extract numeric value
        const pointsMatch = pointsText.match(/(\d+(?:\.\d+)?)/);
        
        if (pointsMatch) {
            const points = parseFloat(pointsMatch[1]);
            return isNaN(points) ? null : points;
        }

        return null;
    }

    /**
     * Validate parsed standings data structure and completeness
     * @param {Array} p_standingsData - Array of standings objects to validate
     * @returns {Object} Validation result with isValid boolean and details
     */
    validateStandingsData(p_standingsData) {
        const validation = {
            isValid: false,
            teamCount: 0,
            errors: [],
            warnings: []
        };

        if (!Array.isArray(p_standingsData)) {
            validation.errors.push('Standings data is not an array');
            return validation;
        }

        if (p_standingsData.length === 0) {
            validation.errors.push('No standings data found');
            return validation;
        }

        validation.teamCount = p_standingsData.length;
        const teamNames = new Set();

        // Validate each team entry
        p_standingsData.forEach((team, index) => {
            if (!team || typeof team !== 'object') {
                validation.errors.push(`Team ${index + 1}: Invalid team object`);
                return;
            }

            // Check team name
            if (!team.team || typeof team.team !== 'string' || team.team.trim().length === 0) {
                validation.errors.push(`Team ${index + 1}: Missing or invalid team name`);
            } else {
                // Check for duplicate team names
                if (teamNames.has(team.team)) {
                    validation.warnings.push(`Duplicate team name found: ${team.team}`);
                } else {
                    teamNames.add(team.team);
                }
            }

            // Check points (at least one should be present)
            const hasCurrentPoints = typeof team.currentPoints === 'number' && !isNaN(team.currentPoints);
            const hasPotentialPoints = typeof team.potentialPoints === 'number' && !isNaN(team.potentialPoints);

            if (!hasCurrentPoints && !hasPotentialPoints) {
                validation.warnings.push(`Team ${team.team || index + 1}: No valid points data`);
            }
        });

        // Consider valid if we have teams and no critical errors
        validation.isValid = validation.teamCount > 0 && validation.errors.length === 0;

        return validation;
    }

    /**
     * Parse match HTML to extract match information in existing tab-separated format
     * Maintains compatibility with existing processScores function
     * @param {string} htmlString - HTML response containing match schedule/results
     * @param {string} source - Source type ('regular' or 'playoff') for tracking
     * @returns {Array} Array of match objects compatible with existing format
     */
    parseMatches(htmlString, source = 'regular') {
        console.log(`Parsing ${source} match data from HTML response...`);
        
        if (!htmlString || typeof htmlString !== 'string') {
            console.error('Invalid HTML string provided for match parsing');
            return [];
        }

        try {
            // Create a temporary DOM element to parse the HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlString;

            // Look for tables in the HTML
            const tables = tempDiv.querySelectorAll('table');
            
            if (tables.length === 0) {
                console.warn('No tables found in match HTML');
                return [];
            }

            // Try each table to find the match schedule table
            for (let tableIndex = 0; tableIndex < tables.length; tableIndex++) {
                const table = tables[tableIndex];
                const result = this._parseMatchTable(table, source);
                
                if (result.length > 0) {
                    console.log(`Successfully parsed ${result.length} matches from ${source} table ${tableIndex + 1}`);
                    return result;
                }
            }

            console.warn(`No valid ${source} match data found in any table`);
            return [];

        } catch (error) {
            console.error(`Error parsing ${source} match HTML:`, error);
            return [];
        }
    }

    /**
     * Parse a specific table for match data
     * @private
     * @param {HTMLTableElement} table - The table element to parse
     * @param {string} source - Source type for tracking
     * @returns {Array} Array of match objects
     */
    _parseMatchTable(table, source) {
        const matches = [];
        
        try {
            const rows = table.querySelectorAll('tr');
            
            if (rows.length < 2) {
                // Need at least header + 1 data row
                return [];
            }

            // Find header row and identify column indices
            let headerRowIndex = -1;
            let columnMapping = null;

            // Look for header row (usually first few rows)
            for (let i = 0; i < Math.min(3, rows.length); i++) {
                const headerCells = rows[i].querySelectorAll('th, td');
                const mapping = this._identifyMatchColumns(headerCells);
                
                if (mapping.isValid) {
                    headerRowIndex = i;
                    columnMapping = mapping;
                    break;
                }
            }

            if (headerRowIndex === -1 || !columnMapping) {
                console.warn('Could not identify match table columns');
                return [];
            }

            console.log(`Found match columns for ${source}:`, columnMapping);

            // Parse data rows
            for (let i = headerRowIndex + 1; i < rows.length; i++) {
                const cells = rows[i].querySelectorAll('td, th');
                
                if (cells.length <= Math.max(...Object.values(columnMapping).filter(v => typeof v === 'number'))) {
                    continue; // Skip rows that don't have enough columns
                }

                const matchData = this._extractMatchData(cells, columnMapping, source);
                
                if (matchData) {
                    matches.push(matchData);
                }
            }

            return matches;

        } catch (error) {
            console.error('Error parsing match table:', error);
            return [];
        }
    }

    /**
     * Identify column indices for match data fields
     * @private
     * @param {NodeList} headerCells - Header cells from the table
     * @returns {Object} Object with column indices and validity flag
     */
    _identifyMatchColumns(headerCells) {
        const result = {
            isValid: false,
            dateIndex: -1,
            timeIndex: -1,
            fieldIndex: -1,
            homeTeamIndex: -1,
            awayTeamIndex: -1,
            homeScoreIndex: -1,
            awayScoreIndex: -1
        };

        if (!headerCells || headerCells.length < 4) {
            return result;
        }

        // Convert to array for easier processing
        const headers = Array.from(headerCells).map(cell => 
            (cell.textContent || '').trim().toLowerCase()
        );

        console.log('Match table headers:', headers);

        // Define patterns for each column type
        const patterns = {
            date: ['Date'],
            time: ['Time'],
            field: ['Location'],
            homeTeam: ['Home'],
            awayTeam: ['Visitor'],
            homeScore: ['Goals Home'],
            awayScore: ['Goals Visitor']
        };

        // Search for each column type
        for (let i = 0; i < headers.length; i++) {
            const header = headers[i];
            
            // Check each pattern type
            Object.keys(patterns).forEach(patternType => {
                if (result[patternType + 'Index'] === -1) {
                    const matchesPattern = patterns[patternType].some(pattern => 
                        header.includes(pattern)
                    );
                    
                    if (matchesPattern) {
                        result[patternType + 'Index'] = i;
                    }
                }
            });
        }

        // Apply specific heuristics for AYSO CGI Sports table layout
        // Based on the screenshot: ID, Date, Time, Location, Home, Home Goals, Visitor Goals, Visitor, Pt Adjust, Home, Visitor, Notes
        if (headers.length >= 8) {
            // AYSO CGI Sports layout: ID, Date, Time, Location, Home, Home Score, Visitor Score, Visitor, ...
            if (result.dateIndex === -1) result.dateIndex = 1;      // Date column
            if (result.timeIndex === -1) result.timeIndex = 2;      // Time column  
            if (result.fieldIndex === -1) result.fieldIndex = 3;    // Location column
            if (result.homeTeamIndex === -1) result.homeTeamIndex = 4;   // Home column
            if (result.homeScoreIndex === -1) result.homeScoreIndex = 5; // Home Goals column
            if (result.awayScoreIndex === -1) result.awayScoreIndex = 6; // Visitor Goals column
            if (result.awayTeamIndex === -1) result.awayTeamIndex = 7;   // Visitor column
        }

        // Validate that we found the essential columns
        result.isValid = (result.dateIndex !== -1 && 
                         result.homeTeamIndex !== -1 && 
                         result.awayTeamIndex !== -1);

        console.log('Match column mapping:', result);
        return result;
    }

    /**
     * Extract match data from table row
     * @private
     * @param {NodeList} cells - Table cells from the row
     * @param {Object} columnMapping - Column index mapping
     * @param {string} source - Source type for tracking
     * @returns {Object|null} Match data object or null if invalid
     */
    _extractMatchData(cells, columnMapping, source) {
        try {
            // Extract basic match information
            const date = this._extractCellText(cells[columnMapping.dateIndex]);
            const time = this._extractCellText(cells[columnMapping.timeIndex]);
            const field = this._extractCellText(cells[columnMapping.fieldIndex]);
            const homeTeam = this._extractTeamName(cells[columnMapping.homeTeamIndex]);
            const awayTeam = this._extractTeamName(cells[columnMapping.awayTeamIndex]);

            // Extract scores (may be empty for scheduled but not played games)
            let homeScore = null;
            let awayScore = null;

            if (columnMapping.homeScoreIndex !== -1) {
                homeScore = this._extractScore(cells[columnMapping.homeScoreIndex]);
            }

            if (columnMapping.awayScoreIndex !== -1) {
                awayScore = this._extractScore(cells[columnMapping.awayScoreIndex]);
            }

            // Validate essential fields
            if (!date || !homeTeam || !awayTeam) {
                console.warn('Missing essential match data:', { date, homeTeam, awayTeam });
                return null;
            }

            // Create match object compatible with existing processScores format
            const matchData = {
                date: date,
                time: time || '',
                field: field || '',
                homeTeam: homeTeam,
                awayTeam: awayTeam,
                homeScore: homeScore,
                awayScore: awayScore,
                source: source
            };

            console.log('Extracted match data:', matchData);
            return matchData;

        } catch (error) {
            console.error('Error extracting match data from row:', error);
            return null;
        }
    }

    /**
     * Extract text content from table cell
     * @private
     * @param {HTMLElement} cell - Table cell
     * @returns {string} Cleaned text content
     */
    _extractCellText(cell) {
        if (!cell) {
            return '';
        }

        let text = (cell.textContent || '').trim();
        
        // Clean up common formatting issues
        text = text.replace(/\s+/g, ' '); // Normalize whitespace
        
        // For team names, preserve the format but clean up extra characters
        // Don't remove hyphens and numbers as they're part of team identifiers
        text = text.replace(/^[\s\W]*|[\s\W]*$/g, ''); // Remove only leading/trailing whitespace and punctuation
        
        return text;
    }

    /**
     * Extract team name from table cell, handling AYSO format
     * @private
     * @param {HTMLElement} cell - Table cell containing team name
     * @returns {string} Cleaned team name
     */
    _extractTeamName(cell) {
        if (!cell) {
            return '';
        }

        // First get the basic text content
        let teamName = this._extractCellText(cell);
        
        // Handle cases where the team name might be in a link
        const link = cell.querySelector('a');
        if (link) {
            teamName = (link.textContent || '').trim();
        }
        
        // Clean up the team name while preserving AYSO format (e.g., "12UB-10 Betesh")
        teamName = teamName.replace(/\s+/g, ' '); // Normalize whitespace
        
        // Log the extracted team name for debugging
        if (teamName && teamName.length > 0) {
            console.log('Extracted team name:', teamName);
        }
        
        return teamName;
    }

    /**
     * Extract score value from table cell
     * @private
     * @param {HTMLElement} cell - Table cell containing score
     * @returns {number|null} Score value or null if not a valid score
     */
    _extractScore(cell) {
        if (!cell) {
            return null;
        }

        const scoreText = (cell.textContent || '').trim();
        
        // Empty cell means game not played yet
        if (scoreText === '' || scoreText === '-' || scoreText.toLowerCase() === 'tbd') {
            return null;
        }

        // Extract numeric value
        const scoreMatch = scoreText.match(/(\d+)/);
        
        if (scoreMatch) {
            const score = parseInt(scoreMatch[1], 10);
            return isNaN(score) ? null : score;
        }

        return null;
    }

    /**
     * Convert match data to tab-separated format compatible with existing processScores function
     * @param {Array} matchData - Array of match objects
     * @returns {string} Tab-separated string ready for processScores function
     */
    convertMatchesToTabFormat(matchData) {
        if (!Array.isArray(matchData) || matchData.length === 0) {
            return '';
        }

        const tabLines = [];

        matchData.forEach(match => {
            // Format: Date\tTime\tField\t\tHomeTeam\tHomeScore\tAwayScore\tAwayTeam\t\t\t
            // Note: The existing format has specific tab positions that must be maintained
            const line = [
                match.date || '',           // _iMatchDate = 1
                match.time || '',           // _iMatchTime = 2  
                match.field || '',          // _iMatchField = 3
                '',                         // Empty column
                match.homeTeam || '',       // _iHomeTeamName = 4
                match.homeScore !== null ? match.homeScore.toString() : '', // _iHomeTeamScore = 5
                match.awayScore !== null ? match.awayScore.toString() : '', // _iAwayTeamScore = 6
                match.awayTeam || '',       // _iAwayTeamName = 7
                '',                         // Empty column
                '',                         // Empty column
                ''                          // Empty column
            ].join('\t');

            tabLines.push(line);
        });

        return tabLines.join('\n');
    }

    /**
     * Validate parsed match data structure and completeness
     * @param {Array} matchData - Array of match objects to validate
     * @returns {Object} Validation result with isValid boolean and details
     */
    validateMatchData(matchData) {
        const validation = {
            isValid: false,
            matchCount: 0,
            playedGames: 0,
            scheduledGames: 0,
            errors: [],
            warnings: []
        };

        if (!Array.isArray(matchData)) {
            validation.errors.push('Match data is not an array');
            return validation;
        }

        if (matchData.length === 0) {
            validation.warnings.push('No match data found');
            validation.isValid = true; // Empty is valid, just not useful
            return validation;
        }

        validation.matchCount = matchData.length;

        // Validate each match entry
        matchData.forEach((match, index) => {
            if (!match || typeof match !== 'object') {
                validation.errors.push(`Match ${index + 1}: Invalid match object`);
                return;
            }

            // Check required fields
            if (!match.date || typeof match.date !== 'string' || match.date.trim().length === 0) {
                validation.errors.push(`Match ${index + 1}: Missing or invalid date`);
            }

            if (!match.homeTeam || typeof match.homeTeam !== 'string' || match.homeTeam.trim().length === 0) {
                validation.errors.push(`Match ${index + 1}: Missing or invalid home team`);
            }

            if (!match.awayTeam || typeof match.awayTeam !== 'string' || match.awayTeam.trim().length === 0) {
                validation.errors.push(`Match ${index + 1}: Missing or invalid away team`);
            }

            // Check if game has been played (has scores)
            const hasHomeScore = typeof match.homeScore === 'number' && !isNaN(match.homeScore);
            const hasAwayScore = typeof match.awayScore === 'number' && !isNaN(match.awayScore);

            if (hasHomeScore && hasAwayScore) {
                validation.playedGames++;
            } else if (!hasHomeScore && !hasAwayScore) {
                validation.scheduledGames++;
            } else {
                validation.warnings.push(`Match ${index + 1}: Incomplete score data (${match.homeTeam} vs ${match.awayTeam})`);
            }
        });

        // Consider valid if we have matches and no critical errors
        validation.isValid = validation.matchCount > 0 && validation.errors.length === 0;

        return validation;
    }

    /**
     * Combine regular season and playoff match data into single collection
     * Handles cases where playoff data is empty or unavailable
     * @param {Array} regularSeasonMatches - Array of regular season match objects
     * @param {Array} playoffMatches - Array of playoff match objects (optional)
     * @returns {Array} Combined array of all match objects
     */
    combineMatchData(regularSeasonMatches, playoffMatches) {
        console.log('Combining regular season and playoff match data...');
        
        const combinedMatches = [];
        
        // Add regular season matches
        if (Array.isArray(regularSeasonMatches)) {
            regularSeasonMatches.forEach(match => {
                if (match && typeof match === 'object') {
                    // Ensure source is marked as regular season
                    const regularMatch = { ...match, source: 'regular' };
                    combinedMatches.push(regularMatch);
                }
            });
            console.log(`Added ${regularSeasonMatches.length} regular season matches`);
        } else {
            console.warn('Regular season matches is not an array or is null');
        }

        // Add playoff matches if available
        if (Array.isArray(playoffMatches) && playoffMatches.length > 0) {
            playoffMatches.forEach(match => {
                if (match && typeof match === 'object') {
                    // Ensure source is marked as playoff
                    const playoffMatch = { ...match, source: 'playoff' };
                    combinedMatches.push(playoffMatch);
                }
            });
            console.log(`Added ${playoffMatches.length} playoff matches`);
        } else {
            console.log('No playoff matches to add (empty or unavailable)');
        }

        console.log(`Combined total: ${combinedMatches.length} matches`);
        return combinedMatches;
    }

    /**
     * Validate combined match data and check for consistency
     * @param {Array} combinedMatches - Combined array of match objects
     * @returns {Object} Validation result with detailed analysis
     */
    validateCombinedData(combinedMatches) {
        console.log('Validating combined match data...');
        
        const validation = {
            isValid: false,
            totalMatches: 0,
            regularSeasonMatches: 0,
            playoffMatches: 0,
            playedGames: 0,
            scheduledGames: 0,
            uniqueTeams: new Set(),
            errors: [],
            warnings: [],
            duplicateMatches: []
        };

        if (!Array.isArray(combinedMatches)) {
            validation.errors.push('Combined match data is not an array');
            return validation;
        }

        if (combinedMatches.length === 0) {
            validation.warnings.push('No combined match data found');
            validation.isValid = true; // Empty is technically valid
            return validation;
        }

        validation.totalMatches = combinedMatches.length;

        // Track matches for duplicate detection
        const matchSignatures = new Map();

        // Validate each match and collect statistics
        combinedMatches.forEach((match, index) => {
            if (!match || typeof match !== 'object') {
                validation.errors.push(`Match ${index + 1}: Invalid match object`);
                return;
            }

            // Count by source
            if (match.source === 'regular') {
                validation.regularSeasonMatches++;
            } else if (match.source === 'playoff') {
                validation.playoffMatches++;
            }

            // Validate required fields
            if (!match.date || typeof match.date !== 'string') {
                validation.errors.push(`Match ${index + 1}: Missing or invalid date`);
            }

            if (!match.homeTeam || typeof match.homeTeam !== 'string') {
                validation.errors.push(`Match ${index + 1}: Missing or invalid home team`);
            } else {
                validation.uniqueTeams.add(match.homeTeam);
            }

            if (!match.awayTeam || typeof match.awayTeam !== 'string') {
                validation.errors.push(`Match ${index + 1}: Missing or invalid away team`);
            } else {
                validation.uniqueTeams.add(match.awayTeam);
            }

            // Check for played vs scheduled games
            const hasHomeScore = typeof match.homeScore === 'number' && !isNaN(match.homeScore);
            const hasAwayScore = typeof match.awayScore === 'number' && !isNaN(match.awayScore);

            if (hasHomeScore && hasAwayScore) {
                validation.playedGames++;
            } else if (!hasHomeScore && !hasAwayScore) {
                validation.scheduledGames++;
            } else {
                validation.warnings.push(`Match ${index + 1}: Incomplete score data`);
            }

            // Check for duplicate matches
            if (match.date && match.homeTeam && match.awayTeam) {
                const signature = `${match.date}|${match.homeTeam}|${match.awayTeam}`;
                
                if (matchSignatures.has(signature)) {
                    validation.duplicateMatches.push({
                        signature: signature,
                        indices: [matchSignatures.get(signature), index]
                    });
                    validation.warnings.push(`Duplicate match found: ${match.homeTeam} vs ${match.awayTeam} on ${match.date}`);
                } else {
                    matchSignatures.set(signature, index);
                }
            }
        });

        // Additional validation checks
        if (validation.uniqueTeams.size < 2) {
            validation.warnings.push('Less than 2 unique teams found in match data');
        }

        if (validation.playedGames === 0 && validation.scheduledGames === 0) {
            validation.warnings.push('No valid games found (played or scheduled)');
        }

        // Consider valid if we have matches and no critical errors
        validation.isValid = validation.totalMatches > 0 && validation.errors.length === 0;

        // Convert Set to array for easier consumption
        validation.uniqueTeams = Array.from(validation.uniqueTeams);

        console.log(`Validation complete: ${validation.isValid ? 'VALID' : 'INVALID'}`);
        console.log(`Total matches: ${validation.totalMatches}, Teams: ${validation.uniqueTeams.length}, Played: ${validation.playedGames}`);

        return validation;
    }

    /**
     * Validate parsed data structure and completeness for all data types
     * @param {Object} p_parsedData - Object containing all parsed data
     * @returns {Object} Comprehensive validation result
     */
    validateParsedData(p_parsedData) {
        console.log('Performing comprehensive data validation...');
        
        const validation = {
            isValid: false,
            standings: null,
            matches: null,
            overall: {
                errors: [],
                warnings: []
            }
        };

        if (!p_parsedData || typeof p_parsedData !== 'object') {
            validation.overall.errors.push('Parsed data is not a valid object');
            return validation;
        }

        // Validate standings data if present
        if (p_parsedData.standings) {
            validation.standings = this.validateStandingsData(p_parsedData.standings);
            if (!validation.standings.isValid) {
                validation.overall.errors.push('Standings data validation failed');
            }
        } else {
            validation.overall.warnings.push('No standings data provided');
        }

        // Validate combined match data if present
        if (p_parsedData.matches) {
            validation.matches = this.validateCombinedData(p_parsedData.matches);
            if (!validation.matches.isValid) {
                validation.overall.errors.push('Match data validation failed');
            }
        } else {
            validation.overall.warnings.push('No match data provided');
        }

        // Overall validation - at least one data type should be valid
        validation.isValid = (
            (validation.standings && validation.standings.isValid) ||
            (validation.matches && validation.matches.isValid)
        ) && validation.overall.errors.length === 0;

        console.log(`Overall validation: ${validation.isValid ? 'VALID' : 'INVALID'}`);
        
        return validation;
    }
}


/**
 * HTML Data Parser Utility Functions
 */

/**
 * Create a new HTML data parser instance
 * @returns {HtmlDataParser} New HTML data parser instance
 */
function createHtmlDataParser() {
    return new HtmlDataParser();
}

/**
 * Parse all data from AJAX fetch result
 * @param {Object} fetchResult - Result from AjaxDataManager.fetchAllData()
 * @returns {Object} Object containing parsed standings and match data
 */
function parseAllDataFromFetchResult(fetchResult) {
    console.log('Parsing all data from AJAX fetch result...');
    
    if (!fetchResult || typeof fetchResult !== 'object') {
        console.error('Invalid fetch result provided for parsing');
        return null;
    }

    const parser = createHtmlDataParser();
    const parsedData = {
        divisionName: fetchResult.divisionName,
        standings: null,
        matches: null,
        errors: [...(fetchResult.errors || [])],
        warnings: [...(fetchResult.warnings || [])]
    };

    // Parse standings data
    if (fetchResult.standings) {
        try {
            parsedData.standings = parser.parseStandings(fetchResult.standings);
            console.log(`Parsed ${parsedData.standings.length} teams from standings`);
        } catch (error) {
            console.error('Error parsing standings:', error);
            parsedData.errors.push(`Standings parsing error: ${error.message}`);
        }
    }

    // Parse regular season matches
    let regularMatches = [];
    if (fetchResult.regular) {
        try {
            regularMatches = parser.parseMatches(fetchResult.regular, 'regular');
            console.log(`Parsed ${regularMatches.length} regular season matches`);
        } catch (error) {
            console.error('Error parsing regular season matches:', error);
            parsedData.errors.push(`Regular season parsing error: ${error.message}`);
        }
    }

    // Parse playoff matches
    let playoffMatches = [];
    if (fetchResult.playoff) {
        try {
            playoffMatches = parser.parseMatches(fetchResult.playoff, 'playoff');
            console.log(`Parsed ${playoffMatches.length} playoff matches`);
        } catch (error) {
            console.error('Error parsing playoff matches:', error);
            parsedData.warnings.push(`Playoff parsing error: ${error.message}`);
        }
    }

    // Combine match data
    parsedData.matches = parser.combineMatchData(regularMatches, playoffMatches);

    return parsedData;
}

/**
 * Convert parsed match data to format compatible with existing processScores function
 * @param {Array} matchData - Array of parsed match objects
 * @returns {string} Tab-separated string ready for processScores
 */
function convertParsedMatchesToTabFormat(matchData) {
    if (!Array.isArray(matchData) || matchData.length === 0) {
        return '';
    }

    const parser = createHtmlDataParser();
    return parser.convertMatchesToTabFormat(matchData);
}

/**
 * Validate all parsed data
 * @param {Object} parsedData - Parsed data object from parseAllDataFromFetchResult
 * @returns {Object} Validation result
 */
function validateAllParsedData(parsedData) {
    if (!parsedData) {
        return {
            isValid: false,
            errors: ['No parsed data provided'],
            warnings: []
        };
    }

    const parser = createHtmlDataParser();
    return parser.validateParsedData(parsedData);
}

/**
 * Test HTML parsing functionality with sample data
 * @param {string} htmlString - HTML string to test parsing
 * @param {string} dataType - Type of data ('standings' or 'matches')
 * @returns {Object} Test result object
 */
function testHtmlParsing(htmlString, dataType = 'matches') {
    console.log(`=== HTML Parsing Test (${dataType}) ===`);
    
    if (!htmlString || typeof htmlString !== 'string') {
        return {
            success: false,
            error: 'Invalid HTML string provided'
        };
    }

    const parser = createHtmlDataParser();
    
    try {
        let result;
        let validation;

        if (dataType === 'standings') {
            result = parser.parseStandings(htmlString);
            validation = parser.validateStandingsData(result);
        } else {
            result = parser.parseMatches(htmlString, 'test');
            validation = parser.validateMatchData(result);
        }

        console.log(`Parsing test completed: ${validation.isValid ? 'SUCCESS' : 'FAILED'}`);
        
        return {
            success: validation.isValid,
            dataType: dataType,
            parsedCount: result.length,
            parsedData: result,
            validation: validation
        };

    } catch (error) {
        console.error('HTML parsing test failed:', error);
        return {
            success: false,
            dataType: dataType,
            error: error.message
        };
    }
}

// Global HTML data parser instance
let _htmlDataParser = null;

/**
 * Initialize global HTML data parser
 * @returns {boolean} True if initialization successful
 */
function initializeHtmlDataParser() {
    console.log('Initializing HTML data parser...');
    
    try {
        _htmlDataParser = createHtmlDataParser();
        console.log('HTML data parser initialized successfully');
        return true;
    } catch (error) {
        console.error('Failed to initialize HTML data parser:', error);
        return false;
    }
}

/**
 * Get the global HTML data parser instance
 * @returns {HtmlDataParser|null} Global HTML data parser or null if not initialized
 */
function getHtmlDataParser() {
    return _htmlDataParser;
}

let _pointsWin = _bTournamentScoring ? 6 : 3;
let _pointsTie = _bTournamentScoring ? 3 : 1;
let _pointsLose = _bTournamentScoring ? 0 : 0;

let _pointsGoalMax = _bTournamentScoring ? 3 : 0;
let _pointsWinShutout = _bTournamentScoring ? 1 : 0;
let _pointsMax = _bTournamentScoring ? 10 : 3;

// Opponents/choices for the battles
let _arrTeams = [];
let _dataSet = [];
let _gamesByTeam = [];
let _gamesByVs = [];
let _arrScheduleByTeam = [];
let _kvpSchedulesByGame = [];

// Team selection management variables
let _selectedTeams = [];
let _maxSelections = 2;
let _selectionState = {
    isValid: false,
    count: 0
};

// LocalStorage key for saving data
const STORAGE_KEY = 'eloScoresData';

/****************************************
*
* ELO 
*
* https://github.com/moroshko/elo.js/blob/master/elo.js
*
* Adjusted to support a multiplier to account for goal differential and a variable kFactor and chance to win divider
*
*****************************************/

window.Elo = (function () {
    function getRatingDelta(myRating, opponentRating, myGamep_result, p_goalMultiplier) {
        if ([0, 0.5, 1].indexOf(myGamep_result) === -1) {
            return null;
        }

        var multiplier = p_goalMultiplier || 1;

        return _kFactor * multiplier * (myGamep_result - getChanceToWin(myRating, opponentRating));
    }

    function getChanceToWin(myRating, opponentRating) {
        return 1 / (1 + Math.pow(10, (opponentRating - myRating) / _chanceWinDivider));
    }

    function getNewRating(myRating, opponentRating, myGamep_result, p_goalMultiplier) {
        return myRating + getRatingDelta(myRating, opponentRating, myGamep_result, p_goalMultiplier);
    }

    return {
        getRatingDelta: getRatingDelta,
        getNewRating: getNewRating,
        getChanceToWin: getChanceToWin
    };
})();

/****************************************
*
* Implementation
*
*****************************************/

var _indexLeftTeam = null;
var _indexRightTeam = null;

var iName = 2;
var iScore = 3;
var iBattles = 4;
var iWin = 5;
var iLose = 6;
var iTie = 7;
var iGoalFor = 8;
var iGoalAgainst = 9;

var iOpWin = 10;
var iOpLose = 11;
var iOpponents = 12;
var iChange = 13;

var iPoints = 14;
var iOpScore = 15;
var iGoalDiff = 16;

var iOpTie = 17;

var iSoS = 18;
var iSoV = 19;
var iPPct = 20;

var iScalePoints = 21;
var iRefCurrentPoints = 22;
var iRefPotentialPoints = 23;

function myRound(p_numToRound, p_digits) {
    var num = p_numToRound || 0;
    var dig = p_digits || 0;

    if (dig == 0) {
        return Math.round(num);
    }
    else if (dig > 0) {
        return num.toPrecision(dig);
    }
    else {
        return num;
    }
}

function updateRatings(p_p_result, p_skipUpdatingTable, p_goalMultiplier) {
    var leftTeam = _dataSet[_indexLeftTeam];
    var rightTeam = _dataSet[_indexRightTeam];

    // delta
    leftTeam[iChange] = myRound(Elo.getRatingDelta(leftTeam[iScore], rightTeam[iScore], 1 - p_p_result, p_goalMultiplier), 0);
    rightTeam[iChange] = myRound(Elo.getRatingDelta(rightTeam[iScore], leftTeam[iScore], p_p_result, p_goalMultiplier));

    // new score 
    leftTeam[iScore] = myRound(Elo.getNewRating(leftTeam[iScore], rightTeam[iScore], 1 - p_p_result, p_goalMultiplier), 0);
    rightTeam[iScore] = myRound(Elo.getNewRating(rightTeam[iScore], leftTeam[iScore], p_p_result, p_goalMultiplier), 0);

    // battles
    leftTeam[iBattles] = (leftTeam[iBattles] || 0) + 1
    rightTeam[iBattles] = (rightTeam[iBattles] || 0) + 1;

    if (p_skipUpdatingTable) {

    }
    else {
        updateTable();
        loadButtons();
    }

    return leftTeam[iChange];
}

function updateTable() {
    // clear it
    oTable.clear();

    // set data
    oTable.rows.add(_dataSet);

    // redraw
    oTable.draw();
}

function addTeam(p_strTeamName) {
    _dataSet = _dataSet || [];
    _arrTeams = _arrTeams || [];

    _dataSet.push([null, 0, p_strTeamName, 1000, null, null, null, null, 0, 0, 0, 0, [], null, 0, 0, 0, 0, 0, 0, 0])
    _arrTeams.push(p_strTeamName);
}

function addGameByTeam(p_strMainTeam, p_strGame) {
    _gamesByTeam = _gamesByTeam || [];

    _gamesByTeam[p_strMainTeam] = _gamesByTeam[p_strMainTeam] || [];

    _gamesByTeam[p_strMainTeam].push(p_strGame);
}


function addGameByVs(p_strAvsB, p_strGame) {
    _gamesByVs = _gamesByVs || [];

    _gamesByVs[p_strAvsB] = _gamesByVs[p_strAvsB] || [];

    _gamesByVs[p_strAvsB].push(p_strGame);
}



function recordGame(p_leftTeam, p_rightTeam, p_result, leftScore, rightScore, p_date) {

    var fixRightTeamName = p_leftTeam;
    var fixLeftTeamName = p_rightTeam;


    var leftStyle = "tie";
    var rightStyle = "tie";

    _indexRightTeam = _arrTeams.indexOf(fixRightTeamName);
    if (_indexRightTeam < 0) {
        addTeam(fixRightTeamName);
        _indexRightTeam = _arrTeams.indexOf(fixRightTeamName);
    }

    _indexLeftTeam = _arrTeams.indexOf(fixLeftTeamName);
    if (_indexLeftTeam < 0) {
        addTeam(fixLeftTeamName);
        _indexLeftTeam = _arrTeams.indexOf(fixLeftTeamName);
    }

    var leftTeam = _dataSet[_indexLeftTeam];
    var rightTeam = _dataSet[_indexRightTeam];

    leftTeam[iOpponents].push(_indexRightTeam);
    rightTeam[iOpponents].push(_indexLeftTeam);


    var goalMultiplier = 1;

    if (_bUseScores) {
        var winnerRating = (leftScore > rightScore) ? leftTeam[iScore] : rightTeam[iScore];
        var loserRating = (rightScore > leftScore) ? rightTeam[iScore] : leftTeam[iScore];

        // https://fivethirtyeight.com/features/introducing-nfl-elo-ratings/
        goalMultiplier = Math.min(1, Math.log(Math.abs(leftScore - rightScore) + 1) * (2.2 / ((winnerRating - loserRating) * 0.001 + 2.2)));
        console.log(goalMultiplier);
    }

    var leftChangeRaw = updateRatings(p_result, true, goalMultiplier);

    var leftChange = plusMinusFormat(leftChangeRaw);
    var rightChange = plusMinusFormat(leftChangeRaw * -1);

    var leftPoints = 0;
    var rightPoints = 0;

    leftTeam[iPoints] += Math.min(_pointsGoalMax, rightScore);
    rightTeam[iPoints] += Math.min(_pointsGoalMax, leftScore);

    // left win 
    if (p_result == 0) {
        leftStyle = "win";
        rightStyle = "lose";

        leftPoints += _pointsWin;

        if (leftScore == 0) {
            leftPoints += _pointsWinShutout
        }

        leftTeam[iWin] = (leftTeam[iWin] || 0) + 1
        rightTeam[iLose] = (rightTeam[iLose] || 0) + 1;
    }
    // left lose
    else if (p_result == 1) {
        leftStyle = "lose";
        rightStyle = "win";

        if (rightScore == 0) {
            rightPoints += _pointsWinShutout
        }

        rightPoints += _pointsWin;

        rightTeam[iWin] = (rightTeam[iWin] || 0) + 1
        leftTeam[iLose] = (leftTeam[iLose] || 0) + 1;
    }
    // tie
    else {
        leftPoints += _pointsTie;
        rightPoints += _pointsTie;

        leftTeam[iTie] = (leftTeam[iTie] || 0) + 1
        rightTeam[iTie] = (rightTeam[iTie] || 0) + 1;
    }

    leftTeam[iPoints] = leftTeam[iPoints] + Math.min(_pointsMax, leftPoints);
    rightTeam[iPoints] = rightTeam[iPoints] + Math.min(_pointsMax, rightPoints);

    leftTeam[iGoalAgainst] = (leftTeam[iGoalAgainst] || 0) + leftScore;
    leftTeam[iGoalFor] = (leftTeam[iGoalFor] || 0) + rightScore;
    leftTeam[iGoalDiff] = leftTeam[iGoalFor] - leftTeam[iGoalAgainst];
    leftTeam[iGoalDiff] = plusMinusFormat(leftTeam[iGoalDiff]);

    rightTeam[iGoalAgainst] = (rightTeam[iGoalAgainst] || 0) + rightScore;
    rightTeam[iGoalFor] = (rightTeam[iGoalFor] || 0) + leftScore;
    rightTeam[iGoalDiff] = rightTeam[iGoalFor] - rightTeam[iGoalAgainst];
    rightTeam[iGoalDiff] = plusMinusFormat(rightTeam[iGoalDiff]);

    addToGraph(fixLeftTeamName, rightScore, fixRightTeamName, leftScore);

    addGameByTeam(fixLeftTeamName,
        // "<span onclick='showGames(\"" + fixLeftTeamName + "\")'>" + fixLeftTeamName + "</span>" 
        ""
        + "<span class='" + leftStyle + "'>" + rightScore + " - " + leftScore + "</span>"
        + " vs "
        + "<span class='clickme' onclick='showGames(\"" + fixRightTeamName + "\")'>" + fixRightTeamName + "</span>"
        + ` ${leftChange}`
    );

    addGameByTeam(fixRightTeamName,
        // "<span onclick='showGames(\"" + fixRightTeamName + "\")'>" + fixRightTeamName + "</span>" 
        ""
        + "<span class='" + rightStyle + "'>" + leftScore + " - " + rightScore + "</span>"
        + " vs "
        + "<span  class='clickme' onclick='showGames(\"" + fixLeftTeamName + "\")'>" + fixLeftTeamName + "</span>"
        + ` ${rightChange}`
    );


    addGameByVs(
        p_date +
        fixLeftTeamName + " vs " + fixRightTeamName,
        // "<span onclick='showGames(\"" + fixLeftTeamName + "\")'>" + fixLeftTeamName + "</span>" 
        ""
        + "<span class='" + leftStyle + "'>" + rightScore + " - " + leftScore + "</span>"
        + " vs "
        + "<span class='clickme'  onclick='showGames(\"" + fixRightTeamName + "\")'>" + fixRightTeamName + "</span>"
        + ` ${leftChange}`
    );

    addGameByVs(
        p_date +
        fixRightTeamName + " vs " + fixLeftTeamName,
        // "<span onclick='showGames(\"" + fixRightTeamName + "\")'>" + fixRightTeamName + "</span>" 
        ""
        + "<span class='" + rightStyle + "'>" + leftScore + " - " + rightScore + "</span>"
        + " vs "
        + "<span class='clickme'  onclick='showGames(\"" + fixLeftTeamName + "\")'>" + fixLeftTeamName + "</span>"
        + ` ${rightChange}`
    );
}

function plusMinusFormat(p_num) {
    return (p_num > 0) ? "+" + p_num : p_num;
}

var _strGraphBase = "graph LR"
var _strNL = "\r\n";
var _strGraph = "";
var _strGraphArr = [];
    _strGraphArr.push(_strGraphBase + _strNL)

function copyMermaid() {
    
    var copyThis = $('#graph').text();
    
    if (copyThis && copyThis.trim().length > 0) {
        navigator.clipboard.writeText(copyThis);
        
        // Show shorter message for toast notification
        var shortMessage = copyThis.length > 50 ? 'Mermaid code copied!' : `Copied "${copyThis}"`;
        $('#toast').html(shortMessage).show(1).delay(1000).hide(1);
        
        console.log('Mermaid code copied to clipboard');
    } else {
        $('#toast').html('No graph code to copy').show(1).delay(1000).hide(1);
        console.warn('No graph code available to copy');
    }
}

function drawGraph(p_str) {

    var strFromGames = _strGraphArr.join("");

    var strDraw = p_str || strFromGames;

    // Update the raw Mermaid code display (maintains existing copy functionality)
    $("#graph").html(strDraw);

    // Render the Mermaid graph as visual diagram if Mermaid is available
    if (isMermaidReady() && strDraw && strDraw.trim().length > 0) {
        renderMermaidGraph(strDraw)
            .then(success => {
                if (success) {
                    console.log('Graph rendered successfully as visual diagram');
                } else {
                    console.warn('Graph rendering failed, showing raw code only');
                }
            })
            .catch(error => {
                console.error('Error during graph rendering:', error);
            });
    } else {
        // Clear any existing rendered graph if Mermaid is not ready or no content
        clearRenderedGraph();
    }
}

function clearGraph() {
    _strGraph = "";
    _strGraphArr = [];
    
    // Clear original graph state when clearing graph
    clearOriginalGraphState();

    // Clear raw Mermaid code display
    $("#graph").html(_strGraph);
    
    // Clear rendered Mermaid graph
    clearRenderedGraph();
}

function addToGraph(p_team1, p_team1_score, p_team2, p_team2_score) {
    if (_strGraph.length == 0) {
        _strGraph += _strGraphBase + _strNL;
        _strGraphArr.push( _strGraphBase + _strNL )
    }

    var leftTeam = p_team1;
    var righTeam = p_team2;
    var leftScore = p_team1_score;
    var rightScore = p_team2_score;

    if (p_team1_score < p_team2_score) {
        leftTeam = p_team2;
        righTeam = p_team1;
        leftScore = p_team2_score;
        rightScore = p_team1_score;
    }

    var arrow = "-->";

    if (leftScore == rightScore) {
        arrow = "<-.->";
    }

    if ((leftScore - rightScore) >= 5) {
        arrow = "==>";
    }

    var leftTeamClean = nameForGraph(leftTeam);
    var rightTeamClean = nameForGraph(righTeam);

    var strMermaidMatch = `${leftTeamClean}[${leftTeam}]${arrow}|${leftScore}-${rightScore}| ${rightTeamClean}[${righTeam}]` + _strNL;

    _strGraph += strMermaidMatch;

    _strGraphArr.push(strMermaidMatch);
}

function nameForGraph(p_str) {
    return p_str.replace(/[\s-]/g, '');
}
function updateOpponentWinLoss() {
    // go through each team
    for (var i = 0; i < _dataSet.length; i++) {
        // touch each opponent
        for (var j = 0; j < _dataSet[i][iOpponents].length; j++) {
            // and accumulate the wins and losses
            _dataSet[i][iOpWin] += _dataSet[_dataSet[i][iOpponents][j]][iWin];
            _dataSet[i][iOpLose] += _dataSet[_dataSet[i][iOpponents][j]][iLose];
            _dataSet[i][iOpTie] += _dataSet[_dataSet[i][iOpponents][j]][iTie];

            _dataSet[i][iOpScore] += _dataSet[_dataSet[i][iOpponents][j]][iScore];
        }

        // calculate strength of schedule
        _dataSet[i][iSoS] = myRound((_dataSet[i][iOpWin] / (_dataSet[i][iOpWin] + _dataSet[i][iOpLose] + _dataSet[i][iOpTie])), 2);

        _dataSet[i][iScalePoints] = myRound(_dataSet[i][iSoS] * _dataSet[i][iPoints], 2);

        // subtract MY wins and losses from opponent
        _dataSet[i][iOpWin] -= _dataSet[i][iWin];
        _dataSet[i][iOpLose] -= _dataSet[i][iLose];
        _dataSet[i][iOpTie] -= _dataSet[i][iTie];

        _dataSet[i][iOpScore] = myRound((_dataSet[i][iOpScore] / _dataSet[i][iBattles]), 0);


        _dataSet[i][iPPct] = myRound((_dataSet[i][iPoints] / (_dataSet[i][iBattles] * 3)), 2);



        /*
        
            TODO - Strength of Schedule 
            
             2016 New England Patriots had a combined record of 111–142–3 (a win percentage of 0.439, the SOS), and Patriots' wins came against teams with a combined record of 93–129–2 (a win percentage of 0.420, the SOV). 
             
        */

        // TEMP 
        // dataSet[i][iPoints] = (dataSet[i][iSoS] * dataSet[i][iPoints]).toPrecision(3);
    }
}

/****************************************
*****************************************
*
* Starter function starts it all 
*
****************************************
*****************************************/

var oTable = null;

$(document).ready(function () {

    // Initialize Mermaid.js library
    initializeMermaid();

    // Initialize and validate division configuration
    console.log('Initializing division configuration...');
    if (!validateGlobalDivisionConfig()) {
        console.error('Failed to initialize division configuration');
        // Continue with initialization but log the error
    } else {
        console.log('Division configuration initialized successfully');
        console.log('Available divisions:', getAvailableDivisions());
        console.log('To test the configuration, run: testDivisionConfiguration()');
    }

    // Initialize division selector UI component
    initializeDivisionSelector();

    // Initialize AJAX data manager
    if (!initializeAjaxDataManager()) {
        console.error('Failed to initialize AJAX data manager');
        // Continue with initialization but log the error
    } else {
        console.log('AJAX data manager initialized successfully');
        console.log('To test AJAX functionality, run: testAjaxFunctionality()');
        console.log('To test data fetching, run: testDataFetching()');
        console.log('Available test functions:');
        console.log('  - testDivisionConfiguration(): Test division config');
        console.log('  - testAjaxFunctionality(): Test basic AJAX');
        console.log('  - testDataFetching(): Test division data fetching');
        console.log('  - testMermaidIntegration(): Test Mermaid graph rendering');
        console.log('  - fetchCurrentDivisionAllData(): Fetch data for current division');
    }

    // Initialize HTML data parser
    if (!initializeHtmlDataParser()) {
        console.error('Failed to initialize HTML data parser');
        // Continue with initialization but log the error
    } else {
        console.log('HTML data parser initialized successfully');
        console.log('Available HTML parsing functions:');
        console.log('  - testHtmlParsing(htmlString, "standings"): Test standings parsing');
        console.log('  - testHtmlParsing(htmlString, "matches"): Test match parsing');
        console.log('  - parseAllDataFromFetchResult(fetchResult): Parse all AJAX data');
    }

    // createDataSet( arrTeams );

    oTable = $('#example').DataTable({
        "order": [
            [3, "desc"]
            , [8, "desc"]
            , [12, "asc"]
            , [13, "desc"]
        ]
        , dom: 'Bfrtip'
        , paging: false
        , info: false
        , searching: false
        , rowId: iName
        , rowCallback: function(row, data, index) {
            // Apply highlighting based on referee points
            const currentPoints = data[iRefCurrentPoints] || 0;
            const seasonPoints = data[iRefPotentialPoints] || 0;
            
            // Remove any existing highlighting classes
            $(row).removeClass('ref-points-excellent ref-points-good ref-points-warning ref-points-danger');
            
            // Apply highlighting based on the specified logic
            if (currentPoints >= 15) {
                $(row).addClass('ref-points-excellent'); // Light blue
            } else if (seasonPoints >= 15) {
                $(row).addClass('ref-points-good'); // Light green
            } else if (seasonPoints >= 11) {
                $(row).addClass('ref-points-warning'); // Light yellow
            } else {
                $(row).addClass('ref-points-danger'); // Light red
            }
        }

        /** TEMP
        , buttons: [
            'copy', 'csv', 'excel', 'pdf', 'print'
        ]**/
        , "data": _dataSet
        , "displayLength": 50

        , "columns": [

            // checkbox column for team selection
            { 
                title: "<input type='checkbox' id='selectAllCheckbox' style='display:none;'>", 
                className: "dt-body-center dt-head-center checkbox-column", 
                orderable: false,
                searchable: false,
                render: function(data, type, row, meta) {
                    return '<input type="checkbox" class="team-checkbox" data-team="' + row[iName] + '">';
                }
            }
            // basic labels
            , { title: "Index", className: "dt-body-right dt-head-right" }
            , { title: "Team", className: "dt-body-left dt-head-left dt-nowrap", data: iName, }

            // calculated points
            , { title: "<span title='Points'>Pts</span>", className: "dt-body-center dt-head-center", data: iPoints }
            , { title: "<span title='% of possible points'>Pts%</span>", className: "dt-body-center dt-head-center", data: iPPct }
            , { title: "<span title='SoS * Points'>Scaled</span>", className: "dt-body-center dt-head-center", data: iScalePoints }



            , { title: "<span title='Elo Rating'>Elo</span>", className: "dt-body-right dt-head-right", data: iScore }
            // , { title: "Change", className: "dt-body-center dt-head-center", data: iChange }

            // straight-up stats
            , { title: "<span title='Matches Played'>MP</span>", className: "dt-body-center dt-head-center", data: iBattles }
            , { title: "<span title='Wins'>W</span>", className: "dt-body-center dt-head-center", data: iWin }
            , { title: "<span title='Draws'>D</span>", className: "dt-body-center dt-head-center", data: iTie }
            , { title: "<span title='Losses'>L</span>", className: "dt-body-center dt-head-center", data: iLose }


            // goals scored/allowed
            , { title: "<span title='Goals For'>GF</span>", className: "dt-body-right dt-head-right", data: iGoalFor }
            , { title: "<span title='Goals Against'>GA</span>", className: "dt-body-right dt-head-right", data: iGoalAgainst }
            , { title: "<span title='Goals Differential'>GD</span>", className: "dt-body-right dt-head-right", data: iGoalDiff }

            // team's opponents strength/performance
            , { title: "<span title='Strength of schedule based on opponent average rating'>OpElo</span>", className: "dt-body-right dt-head-right", data: iOpScore }

            /*
            , { title: "<span title='Opponents wins, excluding this team'>OpWin</span>", className: "dt-body-right dt-head-right", data: iOpWin }
            , { title: "<span title='Opponents losses, excluding this team'>OpLose</span>", className: "dt-body-right dt-head-right", data: iOpLose }
            , { title: "<span title='Opponents ties, excluding this team'>OpTie</span>", className: "dt-body-right dt-head-right", data: iOpTie }
            */

            , { title: "<span title='Strength of Schedule: Opponents record'>SoS</span>", className: "dt-body-right dt-head-right", data: iSoS }
            // , { title: "<span title='Strength of Victory: record of teams this team beat'>SoV</span>", className: "dt-body-right dt-head-right", data: iSoV }
            
            // Referee points columns
            , { title: "<span title='Current Referee Points'>Ref Cur</span>", className: "dt-body-right dt-head-right", data: iRefCurrentPoints }
            , { title: "<span title='Season Referee Points'>Ref Season</span>", className: "dt-body-right dt-head-right", data: iRefPotentialPoints }

        ]
    });

    oTable.on('order.dt search.dt', function () {
        oTable.column(1, { search: 'applied', order: 'applied' }).nodes().each(function (cell, i) {
            cell.innerHTML = (i + 1);
        });
    }).draw();

    var table = $('#example').DataTable();

    $('#example tbody').on('click', 'tr', function () {


        var data = table.row(this).data();

        //console.log("click", data);

        var teamName = data[2];
        //var teamID = arrTeams.indexOf(teamName);
        //var team = dataSet[teamID];

        //console.log("team", team);

        showGames(teamName);

    });

    // Team selection checkbox event handlers
    $('#example tbody').on('click', '.team-checkbox', function(e) {
        e.stopPropagation(); // Prevent row click event
        
        var teamName = $(this).data('team');
        var isChecked = $(this).is(':checked');
        
        // Handle team selection and update all connected components
        var selectionResult = handleTeamSelection(teamName, isChecked);
        
        // If selection was prevented (max reached), ensure checkbox state is correct
        if (!selectionResult && isChecked) {
            $(this).prop('checked', false);
        }
    });


    // Initialize data from localStorage if textarea is empty
    initializeDataFromStorage();
    
    // Add event listener to save data when textarea changes
    $('#thescores').on('input change paste', function() {
        // Use a small delay to ensure the paste operation is complete
        setTimeout(function() {
            saveDataToLocalStorage();
        }, 10);
    });

    // let's capture each game in the database (only if not already processed during initialization)
    var currentData = $('#thescores').val().trim();
    if (currentData !== '') {
        processScores();
    }


});

function showGames(p_strTeam) {
    /*
    // what are the results
    var str = p_strTeam + "<br/>" 
                + "<ol>" + "<li>" + gamesByTeam[p_strTeam].join("</li><li>") + "</li>" + "</ol>";
    
    // where how are we showing
    $("#results").html( str );
    */

    // what are the results
    var str = p_strTeam + "<br/>";

    var schedule = _arrScheduleByTeam[p_strTeam];

    if (schedule) {
        str += "<ol>";
        for (var i = 0; i < schedule.length; i++) {
            //console.log( schedule[i] );
            str += "<li>" + (_gamesByVs[schedule[i]] || _kvpSchedulesByGame[schedule[i]]) + "</li>";
        }
        str += "</ol>";

    }
    else {
        str += "<ol>" + "<li>" + _gamesByTeam[p_strTeam].join("</li><li>") + "</li>" + "</ol>";
    }

    // where how are we showing
    $("#results").html(str);

}

function clearScores() {
    $('#thescores').val("");
    // Save the empty state to localStorage
    saveDataToLocalStorage();
    clearTable();
    clearError();
    clearGames();
}

function clearTable() {
    // RESET global objects
    _arrTeams = [];
    _dataSet = [];
    _gamesByTeam = [];
    _gamesByVs = [];

    // Clear graph filtering state
    clearOriginalGraphState();
    
    // Restore original display state completely
    restoreOriginalDisplayState();

    // final call to redraw table
    updateTable();

    clearError();
}

function clearGames() {
    $("#results").html("");
}

const _iGoodNumberOfPieces = 11;
const _iHomeTeamScore = 5;
const _iAwayTeamScore = 6;
const _iMatchDate = 1;
const _iHomeTeamName = 4;
const _iAwayTeamName = 7;
const _iMatchTime = 2;
const _iMatchField = 3;
function processScores(inputData = null, i_standingsData = null) {
    // Save current data to localStorage whenever we process scores (only for manual entry)
    if (!inputData) {
        saveDataToLocalStorage();
    }
    
    clearGames();
    clearGraph();
    clearError();

    _arrScheduleByTeam = [];

    // RESET global objects
    _arrTeams = [];
    _dataSet = [];
    _gamesByTeam = [];
    _gamesByVs = [];
    
    // Clear original graph state when processing new scores
    clearOriginalGraphState();

    // Determine data source - either provided inputData or textarea content
    var dataSource = inputData || $('#thescores').val();
    var lines = dataSource.split('\n');
    var pieces = [];
    var scores = [];

    var iProcessed = 0;

    // Log data source for debugging
    if (inputData) {
        console.log('Processing AJAX-fetched data');
        if (i_standingsData && i_standingsData.length > 0) {
            console.log(`Integrating standings data for ${i_standingsData.length} teams`);
        }
    } else {
        console.log('Processing manual data entry');
    }

    // go line by line 
    for (var i = 0; i < lines.length; i++) {
        pieces = lines[i].split('\t');

        //	console.log(pieces);

        if (pieces.length != _iGoodNumberOfPieces) { continue; }

        scores = [];
        scores[0] = pieces[_iHomeTeamScore] || "";
        scores[1] = pieces[_iAwayTeamScore] || "";

        // First, store the schedule
        recordSchedule(pieces[_iMatchDate], pieces[_iHomeTeamName], pieces[_iAwayTeamName], pieces[_iMatchTime], pieces[_iMatchField])

        // but did we have a Match?  Can we store it? 

        if (scores[0].length <= 0 || scores[1].length <= 0) {
            // we got a SCHEDULE item, game not played yet.
            continue;
        }

        // convert score strings to int
        scores[0] = scores[0] * 1;
        scores[1] = scores[1] * 1;

        if (isNaN(scores[0]) || isNaN(scores[1])) { continue; }

        // we're done parsing, let's record the game

        recordGame(pieces[_iHomeTeamName], pieces[_iAwayTeamName]
            , (scores[1] > scores[0]) ? 0 : (scores[0] > scores[1] ? 1 : 0.5)
            , scores[0], scores[1], pieces[_iMatchDate]);

        iProcessed++;
    }

    if (iProcessed <= 0) {
        setError("Did not find any games to process. Check input.");
    } else {
        // Integrate standings data if provided (from AJAX fetch)
        if (i_standingsData && i_standingsData.length > 0) {
            integrateStandingsData(i_standingsData);
        } else {
            // Initialize all teams with 0 ref points when no standings data is available
            for (let i = 0; i < _dataSet.length; i++) {
                _dataSet[i][iRefCurrentPoints] = 0;
                _dataSet[i][iRefPotentialPoints] = 0;
            }
        }
    }

    // let's add up opponent win/loss
    updateOpponentWinLoss()

    // final call to redraw table
    updateTable();

    drawGraph();
}

/**
 * Integrate standings data with processed match data
 * @param {Array} p_standingsData - Array of standings objects with team, currentPoints, potentialPoints
 */
function integrateStandingsData(p_standingsData) {
    console.log('*****  Integrating standings data with match processing...', p_standingsData);
    
    try {
        // Create a lookup map for standings data
        const standingsMap = new Map();
        p_standingsData.forEach(standing => {
            if (standing.team) {
                standingsMap.set(standing.team, standing);
            }
        });
        
        // Integrate standings data with existing team data in _dataSet
        let integratedCount = 0;
        for (let i = 0; i < _dataSet.length; i++) {
            const teamData = _dataSet[i];
            const teamName = teamData[iName];
            
            if (teamName && standingsMap.has(teamName)) {
                const standings = standingsMap.get(teamName);
                
                // Add standings data to team record using the defined indices
                // Store current and potential referee points
                if (typeof standings.currentPoints === 'number') {
                    teamData[iRefCurrentPoints] = standings.currentPoints;
                } else {
                    teamData[iRefCurrentPoints] = 0;
                }
                if (typeof standings.potentialPoints === 'number') {
                    teamData[iRefPotentialPoints] = standings.potentialPoints;
                } else {
                    teamData[iRefPotentialPoints] = 0;
                }
                
                integratedCount++;
            } else {
                // Initialize ref points to 0 for teams without standings data
                teamData[iRefCurrentPoints] = 0;
                teamData[iRefPotentialPoints] = 0;
            }
        }
        
        console.log(`Integrated standings data for ${integratedCount} teams`);
        
        // Log any teams in standings that weren't found in match data
        const matchTeams = new Set(_dataSet.map(team => team[iName]));
        const standingsOnlyTeams = p_standingsData
            .map(s => s.team)
            .filter(team => !matchTeams.has(team));
            
        if (standingsOnlyTeams.length > 0) {
            console.log('Teams in standings but not in matches:', standingsOnlyTeams);
        }
        
    } catch (error) {
        console.error('Error integrating standings data:', error);
        // Don't throw error - just log it and continue without standings integration
    }
}



function recordSchedule(p_date, p_home, p_away, p_time, p_field) {
    //console.log( p_date, p_home, p_away, p_time, p_field);

    var homeTeamSchedule = _arrScheduleByTeam[p_home] || [];
    var awayTeamSchedule = _arrScheduleByTeam[p_away] || [];
    _kvpSchedulesByGame = _kvpSchedulesByGame || [];

    homeTeamSchedule.push(p_date + p_home + " vs " + p_away);

    awayTeamSchedule.push(p_date + p_away + " vs " + p_home);

    _arrScheduleByTeam[p_home] = homeTeamSchedule;
    _arrScheduleByTeam[p_away] = awayTeamSchedule;

    _kvpSchedulesByGame[p_date + p_home + " vs " + p_away] =
        // "<span onclick='showGames(\"" + fixLeftTeamName + "\")'>" + fixLeftTeamName + "</span>" 
        ""
        + p_date
        + " (H) vs "
        + "<span class='clickme' onclick='showGames(\"" + p_away + "\")'>" + p_away + " " + p_time + " " + p_field + "" + "</span>"
        ;

    _kvpSchedulesByGame[p_date + p_away + " vs " + p_home] =
        // "<span onclick='showGames(\"" + fixLeftTeamName + "\")'>" + fixLeftTeamName + "</span>" 
        ""
        + p_date
        + " at "
        + "<span class='clickme' onclick='showGames(\"" + p_home + "\")'>" + p_home + " " + p_time + " " + p_field + "" + "</span>"
        ;

}

function setError(p_msg) {
    $("#error").html(p_msg);
}

function clearError() {
    $("#error").html("");
}

/****************************************
*
* LocalStorage Functions
*
*****************************************/

function saveDataToLocalStorage() {
    try {
        var currentData = $('#thescores').val();
        localStorage.setItem(STORAGE_KEY, currentData);
    } catch (e) {
        console.log('Error saving to localStorage:', e);
    }
}

function loadDataFromLocalStorage() {
   return "";
   
    try {
        var savedData = localStorage.getItem(STORAGE_KEY);
        return savedData || '';
    } catch (e) {
        console.log('Error loading from localStorage:', e);
        return '';
    }
}

function initializeDataFromStorage() {
    var currentData = $('#thescores').val().trim();
    
    // If textarea is empty, load from localStorage
    if (currentData === '') {
        var savedData = loadDataFromLocalStorage();
        if (savedData) {
            $('#thescores').val(savedData);
            processScores();
        }
    }
}


function recordGames() {

    clearGraph();

    // let's add up opponent win/loss
    updateOpponentWinLoss()

    // final call to redraw table
    updateTable();

    drawGraph();
}

/****************************************
*
* Team Selection Management Functions
*
*****************************************/

function handleTeamSelection(teamName, isSelected) {
    if (isSelected) {
        // Check if we can add more selections
        if (_selectedTeams.length >= _maxSelections) {
            // Prevent selection and uncheck the checkbox
            $('input[data-team="' + teamName + '"]').prop('checked', false);
            return false;
        }
        
        // Add team to selection
        if (_selectedTeams.indexOf(teamName) === -1) {
            _selectedTeams.push(teamName);
        }
    } else {
        // Remove team from selection
        var index = _selectedTeams.indexOf(teamName);
        if (index > -1) {
            _selectedTeams.splice(index, 1);
        }
    }
    
    // Update selection state
    updateSelectionState();
    
    // Update UI based on selection count
    updateCheckboxStates();
    
    return true;
}

function updateSelectionState() {
    _selectionState.count = _selectedTeams.length;
    _selectionState.isValid = (_selectionState.count === 2);
    
    // Update head-to-head panel visibility based on selection state
    updateHeadToHeadPanelVisibility();
    
    // Update graph filtering based on selection state
    updateGraphFiltering();
    
    // Ensure checkbox states are consistent with selection state
    validateCheckboxStates();
}

/**
 * Validate and correct checkbox states to ensure consistency with selection array
 * This handles edge cases where UI state might become inconsistent
 */
function validateCheckboxStates() {
    $('.team-checkbox').each(function() {
        var teamName = $(this).data('team');
        var shouldBeChecked = _selectedTeams.indexOf(teamName) !== -1;
        var isCurrentlyChecked = $(this).is(':checked');
        
        // Correct any inconsistencies
        if (shouldBeChecked !== isCurrentlyChecked) {
            $(this).prop('checked', shouldBeChecked);
        }
    });
}

function updateCheckboxStates() {
    if (_selectedTeams.length >= _maxSelections) {
        // Disable unchecked checkboxes when max selections reached
        $('.team-checkbox:not(:checked)').prop('disabled', true);
    } else {
        // Enable all checkboxes when under max selections
        $('.team-checkbox').prop('disabled', false);
    }
}

/****************************************
*
* Selection Utility Functions
*
*****************************************/

function getSelectedTeams() {
    return _selectedTeams.slice(); // Return a copy of the array
}

function clearAllSelections() {
    // Clear the selection array
    _selectedTeams = [];
    
    // Uncheck all checkboxes
    $('.team-checkbox').prop('checked', false);
    
    // Enable all checkboxes
    $('.team-checkbox').prop('disabled', false);
    
    // Update selection state (this will also hide the panel)
    updateSelectionState();
}

function isExactlyTwoTeamsSelected() {
    return _selectionState.isValid && _selectedTeams.length === 2;
}

function getSelectionCount() {
    return _selectedTeams.length;
}

function isValidSelectionCount() {
    return _selectionState.isValid;
}

/****************************************
*
* Head-to-Head Comparison Calculator Functions
*
*****************************************/

/**
 * Calculate win probabilities for two teams using their ELO ratings
 * @param {Array} team1Data - First team's data array from _dataSet
 * @param {Array} team2Data - Second team's data array from _dataSet
 * @returns {Object} Object containing win probabilities for both teams
 */
function calculateWinProbabilities(team1Data, team2Data) {
    if (!team1Data || !team2Data) {
        return null;
    }
    
    var team1Rating = team1Data[iScore];
    var team2Rating = team2Data[iScore];
    
    var team1WinChance = Elo.getChanceToWin(team1Rating, team2Rating);
    var team2WinChance = Elo.getChanceToWin(team2Rating, team1Rating);
    
    return {
        team1WinProbability: team1WinChance,
        team2WinProbability: team2WinChance
    };
}

/**
 * Calculate potential ELO rating changes for win/tie/loss scenarios
 * @param {Array} team1Data - First team's data array from _dataSet
 * @param {Array} team2Data - Second team's data array from _dataSet
 * @returns {Object} Object containing ELO deltas for all match outcomes
 */
function calculatePotentialELOChanges(team1Data, team2Data) {
    if (!team1Data || !team2Data) {
        return null;
    }
    
    var team1Rating = team1Data[iScore];
    var team2Rating = team2Data[iScore];
    var goalMultiplier = 1; // Default multiplier, using existing parameter
    
    // Calculate ELO changes for different outcomes
    // Result values: 1 = win, 0.5 = tie, 0 = loss
    var team1Changes = {
        win: myRound(Elo.getRatingDelta(team1Rating, team2Rating, 1, goalMultiplier), 0),
        tie: myRound(Elo.getRatingDelta(team1Rating, team2Rating, 0.5, goalMultiplier), 0),
        loss: myRound(Elo.getRatingDelta(team1Rating, team2Rating, 0, goalMultiplier), 0)
    };
    
    var team2Changes = {
        win: myRound(Elo.getRatingDelta(team2Rating, team1Rating, 1, goalMultiplier), 0),
        tie: myRound(Elo.getRatingDelta(team2Rating, team1Rating, 0.5, goalMultiplier), 0),
        loss: myRound(Elo.getRatingDelta(team2Rating, team1Rating, 0, goalMultiplier), 0)
    };
    
    return {
        team1ELOChanges: team1Changes,
        team2ELOChanges: team2Changes
    };
}

/**
 * Extract team data from _dataSet array by team name
 * @param {string} teamName - Name of the team to find
 * @returns {Array|null} Team data array or null if not found
 */
function getTeamDataByName(teamName) {
    if (!teamName || !_dataSet || _dataSet.length === 0) {
        return null;
    }
    
    for (var i = 0; i < _dataSet.length; i++) {
        if (_dataSet[i][iName] === teamName) {
            return _dataSet[i];
        }
    }
    
    return null;
}

/**
 * Format ELO changes with proper +/- notation
 * @param {number} eloChange - The ELO change value
 * @returns {string} Formatted ELO change string with +/- notation
 */
function formatELOChange(eloChange) {
    if (typeof eloChange !== 'number') {
        return '0';
    }
    
    return plusMinusFormat(eloChange);
}

/**
 * Structure comparison data for display between two teams
 * @param {string} team1Name - Name of the first team
 * @param {string} team2Name - Name of the second team
 * @returns {Object|null} Structured comparison data or null if teams not found
 */
function formatComparisonData(team1Name, team2Name) {
    if (!team1Name || !team2Name) {
        return null;
    }
    
    var team1Data = getTeamDataByName(team1Name);
    var team2Data = getTeamDataByName(team2Name);
    
    if (!team1Data || !team2Data) {
        return null;
    }
    
    // Calculate win probabilities
    var probabilities = calculateWinProbabilities(team1Data, team2Data);
    if (!probabilities) {
        return null;
    }
    
    // Calculate potential ELO changes
    var eloChanges = calculatePotentialELOChanges(team1Data, team2Data);
    if (!eloChanges) {
        return null;
    }
    
    // Structure the data for display
    var comparisonData = {
        team1: {
            fullData: team1Data,
            name: team1Name,
            eloRating: team1Data[iScore],
            winProbability: Math.round(probabilities.team1WinProbability * 100), // Convert to percentage
            eloChanges: {
                win: formatELOChange(eloChanges.team1ELOChanges.win),
                tie: formatELOChange(eloChanges.team1ELOChanges.tie),
                loss: formatELOChange(eloChanges.team1ELOChanges.loss)
            }
        },
        team2: {
            
            fullData: team2Data,
            name: team2Name,
            eloRating: team2Data[iScore],
            winProbability: Math.round(probabilities.team2WinProbability * 100), // Convert to percentage
            eloChanges: {
                win: formatELOChange(eloChanges.team2ELOChanges.win),
                tie: formatELOChange(eloChanges.team2ELOChanges.tie),
                loss: formatELOChange(eloChanges.team2ELOChanges.loss)
            }
        }
    };
    
    return comparisonData;
}

/****************************************
*
* Head-to-Head Display Panel Functions
*
*****************************************/

/**
 * Populate the head-to-head panel with team comparison data
 * @param {Object} comparisonData - Structured comparison data from formatComparisonData()
 */
function populateHeadToHeadPanel(comparisonData) {
    if (!comparisonData) {
        return;
    }
    
    console.log(comparisonData);

    var team1 = comparisonData.team1;
    var team2 = comparisonData.team2;

    var team1Full = team1.fullData;
    var team2Full = team2.fullData;
    
    var html = '';
    
    // Team comparison section
    html += '<div class="team-comparison">';
    html += '  <div class="team-info">';
    html += `    <div class="team-name">${team1.name} (${team1Full[iWin] || 0}-${team1Full[iTie] || 0}-${team1Full[iLose] || 0}) </div>`;
    html += '    <div class="team-elo">ELO: ' + team1.eloRating + '</div>';
    html += '    <div class="win-probability">' + team1.winProbability + '%</div>';
    html += '  </div>';
    html += '  <div class="vs-separator">VS</div>';
    html += '  <div class="team-info">';
    html += `    <div class="team-name">${team2.name} (${team2Full[iWin] || 0}-${team2Full[iTie] || 0}-${team2Full[iLose] || 0}) </div>`;
    html += '    <div class="team-elo">ELO: ' + team2.eloRating + '</div>';
    html += '    <div class="win-probability">' + team2.winProbability + '%</div>';
    html += '  </div>';
    html += '</div>';
    
    // ELO changes table
    html += '<table class="elo-changes-table">';
    html += '  <thead>';
    html += '    <tr>';
    html += '      <th>Outcome</th>';
    html += '      <th>' + team1.name + ' ELO Change</th>';
    html += '      <th>' + team2.name + ' ELO Change</th>';
    html += '    </tr>';
    html += '  </thead>';
    html += '  <tbody>';
    
    // Win scenario (team1 wins)
    html += '    <tr>';
    html += '      <td class="team-column">' + team1.name + ' Wins</td>';
    html += '      <td class="' + getELOChangeClass(team1.eloChanges.win) + '">' + team1.eloChanges.win + '</td>';
    html += '      <td class="' + getELOChangeClass(team2.eloChanges.loss) + '">' + team2.eloChanges.loss + '</td>';
    html += '    </tr>';
    
    // Tie scenario
    html += '    <tr>';
    html += '      <td class="team-column">Tie</td>';
    html += '      <td class="' + getELOChangeClass(team1.eloChanges.tie) + '">' + team1.eloChanges.tie + '</td>';
    html += '      <td class="' + getELOChangeClass(team2.eloChanges.tie) + '">' + team2.eloChanges.tie + '</td>';
    html += '    </tr>';
    
    // Win scenario (team2 wins)
    html += '    <tr>';
    html += '      <td class="team-column">' + team2.name + ' Wins</td>';
    html += '      <td class="' + getELOChangeClass(team1.eloChanges.loss) + '">' + team1.eloChanges.loss + '</td>';
    html += '      <td class="' + getELOChangeClass(team2.eloChanges.win) + '">' + team2.eloChanges.win + '</td>';
    html += '    </tr>';
    
    html += '  </tbody>';
    html += '</table>';
    
    // Update the panel content
    $('#comparisonData').html(html);
}

/**
 * Get CSS class for ELO change styling based on value
 * @param {string} eloChangeStr - ELO change string (e.g., "+15", "-10", "0")
 * @returns {string} CSS class name for styling
 */
function getELOChangeClass(eloChangeStr) {
    if (!eloChangeStr && eloChangeStr !== 0) {
        return 'elo-change-neutral';
    }
    
    // Convert to string if it's a number, then remove '+' sign for parsing
    var strValue = String(eloChangeStr);
    var numValue = parseFloat(strValue.replace('+', ''));
    
    if (numValue > 0) {
        return 'elo-change-positive';
    } else if (numValue < 0) {
        return 'elo-change-negative';
    } else {
        return 'elo-change-neutral';
    }
}

/**
 * Show the head-to-head panel with comparison data
 * Updates panel content and makes it visible
 */
function showHeadToHeadPanel() {
    if (!isExactlyTwoTeamsSelected()) {
        return;
    }
    
    var selectedTeams = getSelectedTeams();
    var comparisonData = formatComparisonData(selectedTeams[0], selectedTeams[1]);
    
    if (comparisonData) {
        populateHeadToHeadPanel(comparisonData);
        $('#headToHeadPanel').show();
    }
}

/**
 * Hide the head-to-head panel and clear its content
 */
function hideHeadToHeadPanel() {
    $('#headToHeadPanel').hide();
    $('#comparisonData').html('');
}

/**
 * Update panel visibility based on current selection state
 * Shows panel when exactly 2 teams selected, hides otherwise
 */
function updateHeadToHeadPanelVisibility() {
    if (isExactlyTwoTeamsSelected()) {
        showHeadToHeadPanel();
    } else {
        hideHeadToHeadPanel();
    }
}

/****************************************
*
* Graph Filtering Functions
*
*****************************************/

// Store original graph state for restoration
var _originalGraphArr = null;
var _isGraphFiltered = false;

/**
 * Filter _strGraphArr for matches involving selected teams
 * @param {string} team1Name - Name of the first selected team
 * @param {string} team2Name - Name of the second selected team
 * @returns {Array} Filtered array of graph strings containing only matches with selected teams
 */
function filterGraphForSelectedTeams(team1Name, team2Name) {
    if (!team1Name || !team2Name || !_strGraphArr || _strGraphArr.length === 0) {
        return [];
    }
    
    // Store original graph for restoration if not already stored
    if (!_originalGraphArr) {
        _originalGraphArr = _strGraphArr.slice(); // Create a copy
    }
    
    var filteredGraph = [];
    
    // Always include the graph base (first element)
    if (_strGraphArr.length > 0) {
        filteredGraph.push(_strGraphArr[0]);
    }
    
    // Clean team names for matching (same logic as nameForGraph function)
    var team1Clean = nameForGraph(team1Name);
    var team2Clean = nameForGraph(team2Name);
    
    // Filter matches that involve either selected team
    for (var i = 1; i < _strGraphArr.length; i++) {
        var graphLine = _strGraphArr[i];
        
        // Check if this graph line contains either selected team
        // Graph lines contain team names in format: TeamClean[Team Name]
        if (graphLine.indexOf(team1Clean + '[') !== -1 || 
            graphLine.indexOf(team2Clean + '[') !== -1 ||
            graphLine.indexOf('[' + team1Name + ']') !== -1 ||
            graphLine.indexOf('[' + team2Name + ']') !== -1) {
            filteredGraph.push(graphLine);
        }
    }
    
    return filteredGraph;
}

/**
 * Rebuild Mermaid graph string from filtered matches
 * @param {Array} filteredGraphArray - Array of filtered graph strings
 * @returns {string} Complete Mermaid graph string ready for display
 */
function buildFilteredGraphString(filteredGraphArray) {
    if (!filteredGraphArray || filteredGraphArray.length === 0) {
        return _strGraphBase + _strNL; // Return base graph if no matches
    }
    
    return filteredGraphArray.join('');
}

/**
 * Apply graph filtering for the currently selected teams
 * Updates the displayed graph to show only matches involving selected teams
 */
function applyGraphFiltering() {
    if (!isExactlyTwoTeamsSelected()) {
        return false;
    }
    
    var selectedTeams = getSelectedTeams();
    var team1Name = selectedTeams[0];
    var team2Name = selectedTeams[1];
    
    // Filter the graph array
    var filteredGraphArray = filterGraphForSelectedTeams(team1Name, team2Name);
    
    if (filteredGraphArray.length > 0) {
        // Update the global graph array with filtered data
        _strGraphArr = filteredGraphArray;
        _isGraphFiltered = true;
        
        // Rebuild and display the filtered graph (both raw code and rendered graph)
        var filteredGraphString = buildFilteredGraphString(filteredGraphArray);
        drawGraph(filteredGraphString);
        
        console.log(`Applied graph filtering for teams: ${team1Name} vs ${team2Name}`);
        return true;
    }
    
    return false;
}

/**
 * Restore full graph display
 * Returns the graph to show all matches by restoring the original _strGraphArr
 */
function restoreFullGraph() {
    if (!_originalGraphArr || !_isGraphFiltered) {
        return false; // Nothing to restore
    }
    
    // Restore the original graph array
    _strGraphArr = _originalGraphArr.slice(); // Create a copy
    _isGraphFiltered = false;
    
    // Redraw the complete graph (both raw code and rendered graph)
    var fullGraphString = buildFilteredGraphString(_strGraphArr);
    drawGraph(fullGraphString);
    
    console.log('Restored full graph display');
    return true;
}

/**
 * Clear the stored original graph state
 * Called when the graph is rebuilt from scratch (e.g., new data loaded)
 */
function clearOriginalGraphState() {
    _originalGraphArr = null;
    _isGraphFiltered = false;
}

/**
 * Update graph filtering based on current team selection state
 * Applies filtering when exactly 2 teams selected, restores full graph otherwise
 * Ensures synchronization between raw code and rendered graph
 */
function updateGraphFiltering() {
    if (isExactlyTwoTeamsSelected()) {
        // Apply graph filtering for the selected teams
        var filterResult = applyGraphFiltering();
        
        if (filterResult) {
            console.log('Graph filtering applied - showing matches for selected teams only');
        }
    } else {
        // Restore full graph when selection is not exactly 2 teams
        if (_isGraphFiltered) {
            var restoreResult = restoreFullGraph();
            
            if (restoreResult) {
                console.log('Graph filtering removed - showing all matches');
            }
        }
    }
}

/**
 * Restore the original display state completely
 * This function ensures all components return to their default state
 */
function restoreOriginalDisplayState() {
    // Clear all team selections
    clearAllSelections();
    
    // Ensure graph is restored to full view
    if (_isGraphFiltered) {
        restoreFullGraph();
    }
    
    // Ensure panel is hidden and content cleared
    hideHeadToHeadPanel();
    
    // Reset checkbox states
    $('.team-checkbox').prop('disabled', false);
    
    // Validate that all states are consistent
    validateCheckboxStates();
}

