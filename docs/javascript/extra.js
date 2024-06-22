// Description: Open external links in a new tab and PDF links in a new tab
// Source: https://jekyllcodex.org/without-plugin/new-window-fix/

//open external links in a new window
function external_new_window() {
    for (let c = document.getElementsByTagName("a"), a = 0; a < c.length; a++) {
        let b = c[a];
        if (b.getAttribute("href") && b.hostname !== location.hostname) {
            b.target = "_blank";
            b.rel = "noopener";
        }
    }
}
//open PDF links in a new window
function pdf_new_window() {
    if (!document.getElementsByTagName) {
        return false;
    }
    let links = document.getElementsByTagName("a");
    for (let eleLink = 0; eleLink < links.length; eleLink++) {
        if ((links[eleLink].href.indexOf('.pdf') !== -1) || (links[eleLink].href.indexOf('.doc') !== -1) || (links[eleLink].href.indexOf('.docx') !== -1)) {
            links[eleLink].onclick =
                function () {
                    window.open(this.href);
                    return false;
                }
        }
    }
}

function apply_rules() {
    external_new_window();
    pdf_new_window();
}

if (typeof document$ !== "undefined") {
    // compatibility with mkdocs-material's instant loading feature
    // based on code from https://github.com/timvink/mkdocs-charts-plugin
    // Copyright (c) 2021 Tim Vink - MIT License
    // fixes [Issue #2](https://github.com/JakubAndrysek/mkdocs-open-in-new-tab/issues/2)
    // eslint-disable-next-line no-undef
    document$.subscribe(function () {
        apply_rules();
    })
}
