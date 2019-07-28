function scrollToWorks() {
    $('html,body').animate({
        scrollTop: $(".services_area").offset().top - $(".main_menu").height()
    },
        'slow');
}

function scrollToAbout() {
    $('html,body').animate({
        scrollTop: $(".about_area").offset().top - $(".main_menu").height()
    },
        'slow');
}

function scrollToPosts() {
    $('html,body').animate({
        scrollTop: $(".blog_area").offset().top - $(".main_menu").height()
    },
        'slow');
}

function newSearch() {

    return null;
}

function calculateMyAge() {

    let myDOB = 860005800000; //InMilliSeconds
    let dateObj = new Date(myDOB);
    let today = new Date();
    let ageInYear = today.getFullYear() - dateObj.getFullYear();
    let ageInMonth = today.getMonth() - dateObj.getMonth() < 0 ? dateObj.getMonth() - today.getMonth() : today.getMonth() - dateObj.getMonth();
    let ageInDay = today.getDate() - dateObj.getDate() < 0 ? dateObj.getDate() - today.getDate() : today.getDate() - dateObj.getDate();

    $("#ageInYear").html(ageInYear);
    $("#ageInMonth").html(ageInMonth);
    $("#ageInDay").html(ageInDay);
}

$(document).ready(function () {
    calculateMyAge();
});