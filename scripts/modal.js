// Get the modal
var modal = document.getElementById("expense-form");
var btn = document.getElementById("toggle-expense-form");
var backBtn = document.getElementById("go-back");
var settleBtn = document.getElementById("settle-expenses");

// Get the <span> element that closes the modal
var span = document.getElementsByClassName("close")[0];

// When the user clicks the button, open the modal 
btn.onclick = function () {
  openModal();
}

// When the user clicks on <span> (x), close the modal
// span.onclick = function() {
//   modal.style.display = "none";
//   btn.style.display = "block";
// }

// When the user clicks anywhere outside of the modal, close it
document.onclick = function (event) {
  if (event.target == modal) {
    closeModal();
  }
}

const closeModal = () => {
  modal.style.display = "none";
  btn.style.display = "";
  backBtn.style.display = "";
  settleBtn.style.display = "";
}

const openModal = () => {
  modal.style.display = "block";
  btn.style.display = "none";
  backBtn.style.display = "none";
  settleBtn.style.display = "none";
}