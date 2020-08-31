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

function calculateMyAgeNew() {
  let dateString = "03/04/1997"
  var now = new Date();
  var today = new Date(now.getYear(), now.getMonth(), now.getDate());

  var yearNow = now.getYear();
  var monthNow = now.getMonth();
  var dateNow = now.getDate();

  var dob = new Date(dateString.substring(6, 10),
    dateString.substring(0, 2) - 1,
    dateString.substring(3, 5)
  );

  var yearDob = dob.getYear();
  var monthDob = dob.getMonth();
  var dateDob = dob.getDate();
  var age = {};
  var ageString = "";
  var yearString = "";
  var monthString = "";
  var dayString = "";


  yearAge = yearNow - yearDob;

  if (monthNow >= monthDob)
    var monthAge = monthNow - monthDob;
  else {
    yearAge--;
    var monthAge = 12 + monthNow - monthDob;
  }

  if (dateNow >= dateDob)
    var dateAge = dateNow - dateDob;
  else {
    monthAge--;
    var dateAge = 31 + dateNow - dateDob;

    if (monthAge < 0) {
      monthAge = 11;
      yearAge--;
    }
  }

  age = {
    years: yearAge,
    months: monthAge,
    days: dateAge
  };

  if (age.years > 1) yearString = " years";
  else yearString = " year";
  if (age.months > 1) monthString = " months";
  else monthString = " month";
  if (age.days > 1) dayString = " days";
  else dayString = " day";


  if ((age.years > 0) && (age.months > 0) && (age.days > 0))
    ageString = age.years + yearString + ", " + age.months + monthString + ", and " + age.days + dayString + " old.";
  else if ((age.years == 0) && (age.months == 0) && (age.days > 0))
    ageString = "Only " + age.days + dayString + " old!";
  else if ((age.years > 0) && (age.months == 0) && (age.days == 0))
    ageString = age.years + yearString + " old. Happy Birthday!!";
  else if ((age.years > 0) && (age.months > 0) && (age.days == 0))
    ageString = age.years + yearString + " and " + age.months + monthString + " old.";
  else if ((age.years == 0) && (age.months > 0) && (age.days > 0))
    ageString = age.months + monthString + " and " + age.days + dayString + " old.";
  else if ((age.years > 0) && (age.months == 0) && (age.days > 0))
    ageString = age.years + yearString + " and " + age.days + dayString + " old.";
  else if ((age.years == 0) && (age.months > 0) && (age.days == 0))
    ageString = age.months + monthString + " old.";
  else ageString = "Oops! Could not calculate age!";

  $("#ageInYear").html(age.years);
  $("#ageInMonth").html(age.months);
  $("#ageInDay").html(age.days);

  //return ageString;
}

function autoCarousel() {
  let owlDesigns = $('#owl-designs');
  if (owlDesigns) {
    //owlDesigns.trigger('play.owl.autoplay',[1000]);
    owlDesigns.owlCarousel({
      autoplay: true,
      autoplayTimeout: 1000,
      autoplayHoverPause: true,
      autoplaySpeed: true
    });
  }
}

$(document).ready(function () {
  calculateMyAgeNew();
  autoCarousel();
});