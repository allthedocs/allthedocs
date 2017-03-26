//
// # [T3 Service] Heading
//
// A [T3 service](http://t3js.org/docs/guides/services) that extracts the headings from
// the page content.
//

function create() {
    
    function getHeadings() {
        
        var headings = [];
        
        [1, 2, 3, 4, 5, 6].forEach(function (level) {
            
            var elements = document.querySelectorAll("#page h" + level);
            
            Array.prototype.forEach.call(elements, function (element) {
                headings.push({
                    id: element.getAttribute("id"),
                    element: element,
                    level: level,
                    text: element.textContent
                });
            });
        });
        
        return headings;
    }
    
//
// ## [method] linkHeadings
//
//     linkHeadings :: undefined
//
// Replaces all regular heading elements in `#page` that have an ID with a link to its own ID so
// that a user can click on a heading to get a shareable link to this part of the document.
//
    function linkHeadings() {
        
        var headings = getHeadings();
        
        headings.forEach(function (heading) {
            heading.element.innerHTML = '<a href="#' + heading.id + '">' +
                heading.element.innerHTML + "</a>";
        });
    }
    
    return {
        getHeadings: getHeadings,
        linkHeadings: linkHeadings
    };
}

module.exports = create;
