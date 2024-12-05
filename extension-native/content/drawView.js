// 创建页面函数
function createPage() {
  const page = $('<div id="cj_move_page"></div>');
  const div = `<div>
        <h3 id="cj_move_h3">my Plugin</h3>
        <button id="cj_but1">与content通讯</button>
    </div>`;
  page.append(div);

  $("body").append(page);

  $("#cj_but1").click(async (e) => {
    chrome.runtime.sendMessage({ action: "fromContent" });
  });

  drag(cj_move_h3);
}
// createPage();

// 拖拽
function drag(ele) {
  let oldX, oldY, newX, newY;
  ele.onmousedown = function (e) {
    if (!cj_move_page.style.right && !cj_move_page.style.bottom) {
      cj_move_page.style.right = 0;
      cj_move_page.style.bottom = 0;
    }
    oldX = e.clientX;
    oldY = e.clientY;
    document.onmousemove = function (e) {
      newX = e.clientX;
      newY = e.clientY;
      cj_move_page.style.right =
        parseInt(cj_move_page.style.right) - newX + oldX + "px";
      cj_move_page.style.bottom =
        parseInt(cj_move_page.style.bottom) - newY + oldY + "px";
      oldX = newX;
      oldY = newY;
    };
    document.onmouseup = function () {
      document.onmousemove = null;
      document.onmouseup = null;
    };
  };
}
