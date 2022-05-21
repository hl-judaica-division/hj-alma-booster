/* why hello there! You may have noticed (considering that you're here), that this password is
    easy to find. Don't worry too much, this password is just to prevent the casual user from
    accessing the extension and ruin records. Actual security is taken care of by the API keys
    which prevent any real issues from occuring.
*/
let entries = 10;
$(function() {
    document.getElementById("admission_password").addEventListener("keydown", function(e) {
        if (e.keyCode == 13) {
            if (this.value === "SoupUpAlma1") {
                $("#lock").fadeOut(complete = function() {
                    const units = document.getElementById("stats_unit").options;
                    unit_list = [];
                    for (let i = 0; i < units.length; i++) {
                        unit_list.push({
                            "name": units[i].innerText,
                            "code": units[i].value,
                        });
                    }
                    chrome.storage.sync.set({
                        "user_type": 0,
                        "library_unit": unit_list,
                        "stats_focus": "#stats_macro_copy",
                    }, function() {
                        setTimeout(function() {
                            window.location.href = "../html/popup.html";
                        }, 400);
                    });
                });
            } else {
                if (entries > 0) {
                    entries--;
                    document.getElementById("remaining").innerHTML = entries;
                } else {
                    document.getElementById("problem").innerHTML = "Quite the risk taker I see. Okay I lied. But seriously you should go get the password!<button type='button' class='close' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>&times;</span></button>";
                }
                document.getElementById("problem").style.display = "";
            }
        }
    });

    // set up quick enter keys
    const enters = document.querySelectorAll("[data-enter-target]");
    for (let i = 0; i < enters.length; i++) {
        enters[i].addEventListener("keydown", function(e) {
            if (e.keyCode == 13) {
                document.getElementById(this.getAttribute("data-enter-target")).click();
            }
        });
    }
});
