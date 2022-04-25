//Get the button:
mybutton = document.getElementById("myBtn");
shareButton = document.getElementById("shareProfile");
// When the user scrolls down 20px from the top of the document, show the button
window.onscroll = function () { scrollFunction() };

function scrollFunction() {
    if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
        mybutton.style.display = "block";
    } else {
        mybutton.style.display = "none";
    }
}

// When the user clicks on the button, scroll to the top of the document
function topFunction() {
    document.body.scrollTop = 0; // For Safari
    document.documentElement.scrollTop = 0; // For Chrome, Firefox, IE and Opera
}


shareButton.addEventListener("click", () => {


    var copyText = window.location.href;



    /* Copy the text inside the text field */
    navigator.clipboard.writeText(copyText);

    /* Alert the copied text */

    let myModal = new bootstrap.Modal(document.getElementById('copiedprofile'), {});
    myModal.show();
});

