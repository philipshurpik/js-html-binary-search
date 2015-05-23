/**
 * Object with parsed file content
 * @type {{}}
 */
var sections = {};
/**
 * Array with sorted words
 * @type {Array}
 */
var wordsList = [];

/************ File index classes ***********/

function Section(id, rawText) {
    this.id = id;
    var splitted = rawText.split('</h2>');
    this.theme = splitted[0];
    this.paragraphs = {};
    var rawParagraphs = splitted[1].split('</p>');
    for (var i = 0, len = rawParagraphs.length; i < len; i++) {
        this.paragraphs[i] = new Paragraph(i, rawParagraphs[i], this.id);
    }
}

function Paragraph(id, text, sectionId) {
    this.id = id;
    this.text = text = text.replace('<p>', '');
    this.sentences = {};
    var rawSentences = text.split('.');
    var sentence = null;
    for (var i = 0, len = rawSentences.length; i < len; i++) {
        sentence = new Sentence(i, rawSentences[i], sectionId, this.id);
        this.sentences[i] = sentence;
    }
}

function Sentence(id, text, sectionId, paragraphId) {
    this.id = id;
    this.text = text = text.trim();
    var rawWords = text.split(' ');
    var word = null;
    for (var i = 0, len = rawWords.length; i < len; i++) {
        if (rawWords[i].length > 0) {
            word = new Word(i, rawWords[i], sectionId, paragraphId, this.id);
            wordsList.push(word);
        }
    }
}

function Word(id, text, sectionId, paragraphId, sentenceId) {
    this.id = id;
    this.sectionId = sectionId;
    this.paragraphId = paragraphId;
    this.sentenceId = sentenceId;
    this.text = text.toLowerCase();
}

/**
 * Start file indexation
 * @param fileText
 * @returns {{status: string}}
 */
function startFileIndex(fileText) {
    var split = fileText.split('<h2>');
    wordsList = [];
    sections = {};
    for (var i = 1, len = split.length; i< len; i++) {
        sections[i] = new Section(i, split[i]);
    }
    wordsList.sort(function(a, b) {
        return a.text == b.text ? 0 : +(a.text > b.text) || -1;
    });
    return {
        status: "success"
    };
}


/*************** Search functions ***************/

/**
 * Binary search function
 * @param items words array
 * @param value key to search
 * @returns {*}
 */
function binarySearch(items, value) {
    var startIndex = 0,
        stopIndex = items.length - 1,
        middle = Math.floor((stopIndex + startIndex) / 2);

    if (!items.length) {
        return -1;
    }

    while (!items[middle].text.startsWith(value) && startIndex < stopIndex) {

        if (value < items[middle].text) {
            stopIndex = middle - 1;
        } else if (value > items[middle].text) {
            startIndex = middle + 1;
        }

        middle = Math.floor((stopIndex + startIndex) / 2);
    }

    return items[middle].text.startsWith(value) ? middle : -1;
}


/**
 * Get 0-4 similar results and total similar count
 * @param resultKeyIndex
 * @param value
 * @returns {Array}
 */
function getSimilarResults(resultKeyIndex, value) {
    var result = [];
    var direction = 0;
    if (wordsList[resultKeyIndex - 1].text.startsWith(value)) {
        direction = -1;
    }
    else if (wordsList[resultKeyIndex + 1].text.startsWith(value)) {
        direction = 1;
    }
    if (direction !== 0) {
        for (var i = 0; true ; i++, resultKeyIndex += direction) {
            if (wordsList[resultKeyIndex].text.startsWith(value)) {
                result.push(wordsList[resultKeyIndex]);
            }
            else {
                break;
            }
        }
    }
    return result;
}

/**
 * Filter next words if search key contains more than one
 * @param resultsArray
 * @param searchKey
 * @returns {Array}
 */
function filterResultsByNextWord(resultsArray, searchKey) {
    var result = [];
    for (var i = 0; i < resultsArray.length; i++) {
        var item = resultsArray[i];
        if (sections[item.sectionId].paragraphs[item.paragraphId].sentences[item.sentenceId].text.indexOf(searchKey) > -1) {
            result.push(item);
        }
    }
    return result;
}

/**
 * Formats result for sending to main thread
 * @param resultsArray
 * @returns {Array}
 */
function getFormattedResult(resultsArray) {
    var formattedResult = [];
    for (var i = 0; i < resultsArray.length; i++) {
        var item = resultsArray[i];
        var formatted = {
            theme: sections[item.sectionId].theme,
            text: sections[item.sectionId].paragraphs[item.paragraphId].sentences[item.sentenceId].text,
            sectionId: item.sectionId
        };
        formattedResult.push(formatted);
    }
    return formattedResult;
}

/**
 * Start file search
 * @param searchKey
 * @returns {{status: string, result: Array, similar: number}}
 */
function startFileSearch(searchKey) {
    var resultsArray = [];
    var formattedResult = [];
    var count = 0;
    var simpleSearchKey = searchKey.split(' ')[0];
    var resultKeyIndex = binarySearch(wordsList, simpleSearchKey);
    if (resultKeyIndex !== -1) {
        resultsArray = [wordsList[resultKeyIndex]];
        var similar = getSimilarResults(resultKeyIndex, simpleSearchKey);
        resultsArray = resultsArray.concat(similar);
        if (searchKey !== simpleSearchKey) {
            resultsArray = filterResultsByNextWord(resultsArray, searchKey);
        }
        count = resultsArray.length;
        formattedResult = getFormattedResult(resultsArray.splice(0, 5));
    }
    return {
        status: resultKeyIndex > -1 ? "success" : "nothing",
        result: formattedResult,
        similar: count
    };
}

/**
 * Worker message handler
 * @param e
 */
self.onmessage = function(e) {
    var t0 = performance.now();
    var result = e.data.message === "index" ? startFileIndex(e.data.fileText) : startFileSearch(e.data.searchKey);
    var t1 = performance.now();
    result.message = e.data.message;
    result.time = (t1 - t0);
    self.postMessage(result);
};