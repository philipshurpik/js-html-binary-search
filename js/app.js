(function SearchController() {

    var indexSearchWorker = new Worker('js/index-search-worker.js');
    indexSearchWorker.onmessage = function(e) {
        console.log('Message: ' + e.data.message + '| Execution time: ', e.data.time);
        if (e.data.message === "search") {
            console.log(e.data.result);
            renderResults(e.data);
        }
    };

    var viewEls = {
        searchField: $('#key'),
        text: $('#text'),
        results: $('#result')
    };

    /**
     * Initialisation function
     */
    (function init() {
        viewEls.searchField.on('keyup', onKeyUp);
        var fileText = viewEls.text[0].innerHTML;
        indexSearchWorker.postMessage({message: "index", fileText: fileText});
        renderAnchors();
    })();


    /**
     * Key up handler
     * @param e
     */
    function onKeyUp(e) {
        viewEls.results.hide();
        var key = e.target.value;
        if (key.length >= 3) {
            indexSearchWorker.postMessage({message: "search", searchKey: key.trim()});
        }
    }

    /**
     * Render results on search complete
     * @param data
     */
    function renderResults(data) {
        var results = data.result;
        viewEls.results.show();
        var list = [];
        var summary = results.length === 0 ? ("<li>Search completed in " + data.time.toFixed(3) + " | Nothing found</li>")
            : ("<li>Search completed in " + data.time.toFixed(3) + " | Found: "+ data.similar +" items </li>");
        list.push(summary);
        for (var i = 0, l = results.length; i < l; i++) {
            var row = (i+1) + ". Theme: " + results[i].theme +
                "<br/>Text: " + results[i].text;
            list.push('<li><a href="#section' + results[i].sectionId + '">' + row +"</a></li>");
        }
        var li = list.join('\n');
        viewEls.results.find('ul').html(li);
        viewEls.results.show();
    }

    /**
     * Anchor rendering function
     */
    function renderAnchors() {
        $('h2').each(function(i, elem) {elem.id = "section"+i})
    }

})();