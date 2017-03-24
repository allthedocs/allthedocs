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
                    level: level,
                    text: element.textContent
                });
            });
        });
        
        return headings;
    }
    
    return {
        getHeadings: getHeadings
    };
}

module.exports = create;
