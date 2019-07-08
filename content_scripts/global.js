/**
 * wait for an element to appear before acting
 * @param  {[string]}   selector the css selector of the element to wait for
 * @param  {[integer]}  timeout  how long to wait before giving up
 * @param  {Function}   callback the function to call once the element appears
 * @return {[interval]}          the loop that is created
 */
function wait_for_el(selector, timeout, callback) {
    const safety = setTimeout(function() {
        clearInterval(temp_loop);
        alert("Judaica Error: Timeout, couldn't find element - " + selector);
    }, timeout);
    const temp_loop = setInterval(function() {
        console.log(selector, "looping");
        const item = document.querySelector(selector);
        if (item) {
            clearInterval(temp_loop);
            clearTimeout(safety);
            callback(item);
        }
    }, 100);
    return temp_loop;
}

/**
 * Create an alert in the element provided
 * @param  {[htmlelement]} elem     element to put alert in
 * @param  {[string]} message       message for the alert
 * @param  {[string]} colour        colour of the alert
 */
function create_alert_in_element(elem, message, colour) {
    const new_alert = document.createElement("div");
    let type = "danger";
    if (colour) {
        type = colour;
    }
    new_alert.className = "alert alert-" + type + " alert-dismissible fade show";
    new_alert.role = "alert";
    new_alert.innerHTML = message;
    new_alert.innerHTML += "<button type='button' class='close' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>&times;</span></button>";
    elem.insertBefore(new_alert, elem.childNodes[0]);
}
