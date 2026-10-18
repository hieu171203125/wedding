(() => {
  "use strict";
  console.log('123')
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  // Luôn chạy hiệu ứng (như 13-9), kể cả khi máy bật "giảm chuyển động"
  const reduceMotion = false;
  const body = document.body;
  const lightbox = $("#lightbox");

  body.classList.add("fp");

  /* =========================================================
     Khách mời: link dạng ?to=Anh%20Tuấn -> in tên lên bìa + trang đầu
     ========================================================= */
  const guest = (new URLSearchParams(location.search).get("to") || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);

  if (guest) {
    // textContent (không dùng innerHTML) -> tên trong link không chèn được mã HTML
    $$("[data-guest-name]").forEach((el) => (el.textContent = guest));
    $$("[data-guest]").forEach((el) => (el.hidden = false));
    document.title = `Kính mời ${guest} · ${document.title}`;
  }

  /* =========================================================
     Fullpage: mỗi gesture chỉ chuyển đúng 1 section
     ========================================================= */
  const slider = $("#slider");
  const slides = $$(".slide");
  const ANIM_SEL = ".a-up, .a-left, .a-right, .a-zoom, .a-pop, .a-fade, .a-mask";
  const DURATION = reduceMotion ? 250 : 850; // khoá điều hướng trong lúc chuyển (như 13-9)
  const GESTURE_GAP = 200; // ms không có wheel event => coi là gesture mới

  let current = 0;
  let animating = false;
  let ready = false; // chỉ cho điều hướng sau khi đã mở thiệp
  let activatedAt = 0;

  // Phần tử chỉ "chạy" khi vừa nằm trong section đang active vừa lọt vào khung nhìn
  const io =
    "IntersectionObserver" in window
      ? new IntersectionObserver(
          (entries) => {
            entries.forEach(({ target, isIntersecting }) => {
              if (!isIntersecting) return;
              const slide = target.closest(".slide");
              // Cuộn tới phần tử ở dưới trong section dài -> hiện ngay, không chờ stagger
              if (slide.classList.contains("active") && performance.now() - activatedAt > 900) {
                target.style.setProperty("--d", "0.05s");
              }
              target.classList.add("in");
            });
          },
          { threshold: 0 }
        )
      : null;

  function primeSlide(slide) {
    $$(ANIM_SEL, slide).forEach((el) => {
      el.style.setProperty("--d", el.dataset.d);
      if (io) {
        el.classList.remove("in");
        io.unobserve(el);
        io.observe(el);
      } else {
        el.classList.add("in");
      }
    });
  }

  function addFloaters(slide) {
    const wrap = document.createElement("div");
    wrap.className = "floaters";
    wrap.setAttribute("aria-hidden", "true");
    const glyphs = ["❀", "✿", "❦", "❁", "♥", "✾"];
    for (let i = 0; i < 6; i++) {
      const s = document.createElement("span");
      s.className = "floater";
      s.textContent = glyphs[i];
      s.style.left = `${4 + Math.random() * 88}%`;
      s.style.top = `${4 + Math.random() * 88}%`;
      s.style.fontSize = `${18 + Math.random() * 34}px`;
      s.style.animationDuration = `${6 + Math.random() * 5}s`;
      s.style.setProperty("--d", `${(0.3 + i * 0.15).toFixed(2)}s`);
      wrap.append(s);
    }
    slide.prepend(wrap);
  }

  slides.forEach((slide) => {
    // Stagger: phần tử sau xuất hiện trễ hơn phần tử trước -> chữ trượt lên từng dòng
    $$(ANIM_SEL, slide).forEach((el, i) => {
      el.dataset.d = `${(0.25 + Math.min(i, 9) * 0.11).toFixed(2)}s`;
    });
    if (!slide.classList.contains("hero")) addFloaters(slide);
    // Parallax: lớp hoa trôi chậm hơn nội dung khi cuộn trong section dài
    slide.addEventListener(
      "scroll",
      () => slide.style.setProperty("--sy", slide.scrollTop),
      { passive: true }
    );
  });

  // Mỗi section vừa khít 1 màn hình (như 13-9): nội dung dài thì thu nhỏ lại,
  // nhờ vậy mỗi lần cuộn/vuốt luôn sang section kế tiếp thay vì cuộn bên trong
  const MIN_FIT = 0.6; // nhỏ hơn mức này thì để cuộn bên trong cho dễ đọc
  function fitSlide(slide) {
    const inner = $(".slide__body", slide);
    if (!inner) return;
    // offsetHeight là chiều cao bố cục thật: không bị ảnh hưởng bởi scale,
    // hoa bay hay translate của hiệu ứng (những thứ làm scrollHeight phình ra)
    const cs = getComputedStyle(slide);
    const avail = slide.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const h = inner.offsetHeight;
    const fit = h > avail ? Math.max(MIN_FIT, (avail / h) * 0.98) : 1;
    inner.style.setProperty("--fit", fit.toFixed(3));
    slide.classList.toggle("is-scaled", fit < 1);
    // Vừa khít -> khoá cuộn bên trong, cuộn chuột/vuốt chỉ dùng để chuyển section
    slide.classList.toggle("is-fit", h * fit <= avail + 1);
  }
  const fitAll = () => slides.forEach(fitSlide);
  fitAll();
  // Nội dung đổi chiều cao (font, ảnh, bản đồ, lời chúc mới...) -> tính lại
  if ("ResizeObserver" in window) {
    const ro = new ResizeObserver((entries) =>
      entries.forEach((en) => fitSlide(en.target.closest(".slide")))
    );
    slides.forEach((s) => {
      const inner = $(".slide__body", s);
      if (inner) ro.observe(inner);
    });
  }
  let fitTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(fitTimer);
    fitTimer = setTimeout(fitAll, 150);
  });

  primeSlide(slides[0]);

  // Như goToSection của 13-9: trượt slider tới -index * 100% và gắn .active cho section
  function goTo(next) {
    next = Math.max(0, Math.min(slides.length - 1, next));
    if (next === current || animating) return;
    animating = true;

    const to = slides[next];
    to.scrollTop = next > current ? 0 : to.scrollHeight;
    to.style.setProperty("--sy", to.scrollTop);
    primeSlide(to);

    current = next;
    slider.style.transform = `translateY(-${current * 100}%)`;
    slides.forEach((s, i) => s.classList.toggle("active", i === current));
    activatedAt = performance.now();
    to.dispatchEvent(new CustomEvent("slide:enter"));
    updateUI();

    setTimeout(() => {
      animating = false;
    }, DURATION);
  }

  // Còn cuộn được bên trong (section dài / danh sách lời chúc) theo hướng dir không?
  function canScrollWithin(target, dir) {
    const slide = slides[current];
    let el = target instanceof Element ? target : null;
    while (el && el !== body) {
      const oy = getComputedStyle(el).overflowY;
      if ((oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight + 1) {
        const can = dir > 0
          ? el.scrollTop + el.clientHeight < el.scrollHeight - 1
          : el.scrollTop > 1;
        if (can) return true;
      }
      if (el === slide) break;
      el = el.parentElement;
    }
    return false;
  }

  const navBlocked = () => !ready || !lightbox.hidden;

  /* ----- Wheel / trackpad ----- */
  let lastWheelAt = 0;
  let gestureSpent = false;

  window.addEventListener(
    "wheel",
    (e) => {
      if (navBlocked()) return;

      const now = performance.now();
      if (now - lastWheelAt > GESTURE_GAP) gestureSpent = false; // gesture mới
      lastWheelAt = now;

      if (Math.abs(e.deltaY) < Math.abs(e.deltaX) || Math.abs(e.deltaY) < 2) return;
      const dir = e.deltaY > 0 ? 1 : -1;

      if (canScrollWithin(e.target, dir)) {
        // gesture này đã dùng để cuộn nội dung -> không được nhảy section nữa
        gestureSpent = true;
        return;
      }

      e.preventDefault();
      // Quán tính của trackpad/chuột vẫn bắn event liên tục -> vẫn là gesture cũ, bỏ qua
      if (gestureSpent || animating) {
        gestureSpent = true;
        return;
      }
      gestureSpent = true;
      goTo(current + dir);
    },
    { passive: false }
  );

  /* ----- Touch ----- */
  let touch = null;

  window.addEventListener(
    "touchstart",
    (e) => {
      if (navBlocked() || e.touches.length > 1) {
        touch = null;
        return;
      }
      const t = e.touches[0];
      touch = {
        x: t.clientX,
        y: t.clientY,
        canDown: canScrollWithin(e.target, 1),
        canUp: canScrollWithin(e.target, -1),
      };
    },
    { passive: true }
  );

  window.addEventListener(
    "touchmove",
    (e) => {
      if (!touch) return;
      const dy = touch.y - e.touches[0].clientY;
      const canNative = dy > 0 ? touch.canDown : touch.canUp;
      if (!canNative && e.cancelable) e.preventDefault(); // chặn bounce / pull-to-refresh
    },
    { passive: false }
  );

  window.addEventListener("touchend", (e) => {
    if (!touch) return;
    const start = touch;
    touch = null;
    const t = e.changedTouches[0];
    const dy = start.y - t.clientY;
    const dx = start.x - t.clientX;
    if (Math.abs(dy) < 50 || Math.abs(dy) < Math.abs(dx)) return;
    const dir = dy > 0 ? 1 : -1;
    // Lúc bắt đầu chạm mà nội dung còn cuộn được -> lần vuốt này là cuộn nội dung
    if (dir > 0 ? start.canDown : start.canUp) return;
    goTo(current + dir); // 1 lần vuốt = 1 section, mạnh cỡ nào cũng vậy
  });

  /* ----- Bàn phím ----- */
  document.addEventListener("keydown", (e) => {
    // Mở thiệp bằng Enter
    if (e.key === "Enter" && !toggle.checked) {
      toggle.checked = true;
      toggle.dispatchEvent(new Event("change"));
      return;
    }
    if (navBlocked() || e.repeat) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;

    if (e.key === "Home") return goTo(0);
    if (e.key === "End") return goTo(slides.length - 1);

    const map = { ArrowDown: 1, PageDown: 1, " ": 1, ArrowUp: -1, PageUp: -1 };
    let dir = map[e.key];
    if (!dir) return;
    if (e.key === " " && e.target.tagName === "BUTTON") return;
    if (e.key === " " && e.shiftKey) dir = -1;

    e.preventDefault();
    const slide = slides[current];
    if (canScrollWithin(slide.lastElementChild, dir) || canScrollWithin(slide, dir)) {
      slide.scrollBy({ top: dir * slide.clientHeight * 0.7, behavior: reduceMotion ? "auto" : "smooth" });
      return;
    }
    goTo(current + dir);
  });

  /* ----- Link nội bộ (#id) ----- */
  $$('a[href^="#"]').forEach((a) => {
    const i = slides.findIndex((s) => `#${s.id}` === a.getAttribute("href"));
    if (i < 0) return;
    a.addEventListener("click", (e) => {
      e.preventDefault();
      if (!navBlocked()) goTo(i);
    });
  });

  /* ----- Dots ----- */
  const dots = document.createElement("nav");
  dots.className = "dots";
  dots.setAttribute("aria-label", "Chuyển trang");
  slides.forEach((s, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "dots__dot";
    b.setAttribute("aria-label", s.dataset.title || `Trang ${i + 1}`);
    b.addEventListener("click", () => !navBlocked() && goTo(i));
    dots.append(b);
  });
  body.append(dots);

  const nav = $(".nav");
  const navLinks = $$(".nav__links a");

  function updateUI() {
    const id = slides[current].id;
    [...dots.children].forEach((d, i) => {
      d.classList.toggle("is-active", i === current);
      d.toggleAttribute("aria-current", i === current);
    });
    navLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === `#${id}`));
    nav.classList.toggle("nav--solid", current > 0);
    try {
      history.replaceState(null, "", `#${id}`);
    } catch {
      /* file:// trên một số trình duyệt */
    }
  }
  updateUI();

  /* ----- Parallax theo con trỏ ở hero ----- */
  const hero = slides[0];
  if (!reduceMotion) {
    window.addEventListener(
      "pointermove",
      (e) => {
        if (current !== 0 || e.pointerType !== "mouse") return;
        hero.style.setProperty("--mx", (e.clientX / innerWidth - 0.5).toFixed(3));
        hero.style.setProperty("--my", (e.clientY / innerHeight - 0.5).toFixed(3));
      },
      { passive: true }
    );
  }

  /* =========================================================
     Mở thiệp
     ========================================================= */
  const toggle = $("#open-card");
  const music = $("#bg-music");
  const musicBtn = $("#music-btn");

  toggle.addEventListener("change", () => {
    if (!toggle.checked) return;
    toggle.disabled = true;
    playMusic();
    burstPetals(40);
    startPetals();

    // Hero bắt đầu hiệu ứng khi hai nửa thiệp đang tách ra
    setTimeout(() => {
      hero.classList.add("active");
      activatedAt = performance.now();
      ready = true;
      // Có #hash trên URL (vd. chia sẻ link #event) -> nhảy tới đó
      const fromHash = slides.findIndex((s) => `#${s.id}` === location.hash);
      if (fromHash > 0) setTimeout(() => goTo(fromHash), 900);
    }, 700);
  });

  /* =========================================================
     Nhạc nền
     ========================================================= */
  function playMusic() {
    musicBtn.hidden = false;
    music.play()
      .then(() => musicBtn.classList.add("is-playing"))
      .catch(() => musicBtn.classList.remove("is-playing"));
  }

  musicBtn.addEventListener("click", () => {
    if (music.error) {
      showToast("Chưa có file nhạc mp3.mp3");
      return;
    }
    if (music.paused) {
      music.play().then(() => musicBtn.classList.add("is-playing")).catch(() => {});
    } else {
      music.pause();
      musicBtn.classList.remove("is-playing");
    }
  });

  /* =========================================================
     Đếm ngược + lịch
     ========================================================= */
  const countdown = $("#countdown");
  const target = new Date(countdown.dataset.date).getTime();
  const units = Object.fromEntries(
    $$("[data-unit]", countdown).map((el) => [el.dataset.unit, el])
  );
  const pad = (n) => String(n).padStart(2, "0");

  function tick() {
    const diff = target - Date.now();
    if (diff <= 0) {
      countdown.innerHTML = '<p class="countdown__done">Hôm nay là ngày chung đôi! ♥</p>';
      clearInterval(timer);
      return;
    }
    units.days.textContent = pad(Math.floor(diff / 86400000));
    units.hours.textContent = pad(Math.floor((diff / 3600000) % 24));
    units.minutes.textContent = pad(Math.floor((diff / 60000) % 60));
    units.seconds.textContent = pad(Math.floor((diff / 1000) % 60));
  }
  const timer = setInterval(tick, 1000);
  tick();

  (function buildCalendar() {
    const [y, m, d] = countdown.dataset.date.slice(0, 10).split("-").map(Number);
    const first = new Date(y, m - 1, 1).getDay(); // 0 = CN
    const offset = (first + 6) % 7; // lịch bắt đầu từ thứ 2
    const total = new Date(y, m, 0).getDate();
    const weekdays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

    let cells = weekdays.map((w) => `<span class="calendar__wd">${w}</span>`).join("");
    cells += "<span></span>".repeat(offset);
    for (let i = 1; i <= total; i++) {
      cells += i === d
        ? `<span class="calendar__day is-wedding" aria-label="Ngày cưới">${i}</span>`
        : `<span class="calendar__day">${i}</span>`;
    }

    const cal = $("#calendar");
    cal.setAttribute("aria-label", `Lịch tháng ${m} năm ${y}`);
    cal.innerHTML = `
      <p class="calendar__head">Tháng ${m} · ${y}</p>
      <div class="calendar__grid">${cells}</div>
      ${countdown.dataset.lunar ? `<p class="calendar__note">${countdown.dataset.lunar}</p>` : ""}`;
  })();

  /* =========================================================
     Google Maps: mỗi thẻ nhà trai / nhà gái là 1 nút mở chỉ đường
     ========================================================= */
  $$(".card[data-address]").forEach((card) => {
    const link = $("[data-dir]", card);
    // Có tọa độ ghim (data-dest) thì chỉ đường tới đúng điểm đó, không thì tìm theo địa chỉ
    const dest = card.dataset.dest || card.dataset.address;
    link.href = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;
    link.setAttribute("aria-label", `Chỉ đường tới ${$("h3", card).textContent} trên Google Maps`);
    // Bấm vào bất kỳ đâu trên thẻ cũng mở Google Maps (điện thoại sẽ mở app Maps)
    card.addEventListener("click", (e) => {
      if (!e.target.closest("[data-dir]")) link.click();
    });
  });

  /* =========================================================
     Hoa rơi
     ========================================================= */
  const petalLayer = $("#petals");
  const PETALS = ["🌸", "❀", "✿", "🍃", "🍀", "🐱"];
  let petalTimer = null;

  const PETAL_EVERY = 450; // ms giữa 2 cánh hoa rơi — nhỏ hơn = dày hơn

  function spawnPetal(fromCenter = false, prefill = false) {
    const p = document.createElement("span");
    p.className = `petal ${Math.random() > 0.4 ? "petal--pink" : "petal--green"}`;
    p.textContent = PETALS[Math.floor(Math.random() * PETALS.length)];
    p.style.fontSize = `${12 + Math.random() * 16}px`;

    if (fromCenter) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 120 + Math.random() * 320;
      p.style.left = "50%";
      p.style.top = "50%";
      p.style.setProperty("--dx", `${Math.cos(angle) * dist}px`);
      p.style.setProperty("--dy", `${Math.sin(angle) * dist}px`);
      p.classList.add("petal--burst");
      p.style.animationDuration = `${1.2 + Math.random()}s`;
    } else {
      p.style.left = `${Math.random() * 100}vw`;
      p.style.setProperty("--drift", `${(Math.random() - 0.5) * 200}px`);
      const dur = 8 + Math.random() * 6;
      p.style.animationDuration = `${dur}s`;
      // Rải sẵn: cho cánh hoa bắt đầu giữa chừng để màn hình có hoa rơi ngay
      if (prefill) p.style.animationDelay = `${-Math.random() * dur}s`;
    }

    p.addEventListener("animationend", () => p.remove());
    petalLayer.appendChild(p);
  }

  function burstPetals(n) {
    if (reduceMotion) return;
    for (let i = 0; i < n; i++) spawnPetal(true);
  }

  function startPetals() {
    if (reduceMotion || petalTimer) return;
    for (let i = 0; i < 14; i++) spawnPetal(false, true);
    petalTimer = setInterval(() => {
      if (!document.hidden) spawnPetal();
    }, PETAL_EVERY);
  }

  /* =========================================================
     Lightbox album
     ========================================================= */
  const frame = $(".lightbox__frame", lightbox);
  const photos = $$(".album .g");
  let photoIndex = 0;

  /* ----- Album: slider ngang tự viết (mobile 1 ảnh, ≥768px 3 ảnh — đặt bằng --per trong CSS) ----- */
  let albumDragged = false; // vừa kéo slider -> không mở lightbox
  (() => {
    const album = $(".album");
    if (!album) return;
    const viewport = $(".album__viewport", album);
    const track = $(".album__track", album);
    const dotsWrap = $(".album__dots", album);
    let index = 0;

    const perView = () => parseInt(getComputedStyle(album).getPropertyValue("--per"), 10) || 1;
    const gap = () => parseFloat(getComputedStyle(track).columnGap) || 0;
    const step = () => photos[0].offsetWidth + gap(); // khoảng cách giữa 2 ảnh liền nhau
    const maxIndex = () => Math.max(0, photos.length - perView());
    // section có thể đang được thu nhỏ (--fit) -> đổi px trên màn hình sang px bố cục
    const screenScale = () => viewport.getBoundingClientRect().width / viewport.offsetWidth || 1;

    function setX(x) {
      track.style.transform = `translate3d(${x}px, 0, 0)`;
    }

    function renderDots() {
      const count = maxIndex() + 1;
      if (dotsWrap.children.length === count) return;
      dotsWrap.replaceChildren(
        ...Array.from({ length: count }, (_, i) => {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "album__dot";
          b.setAttribute("aria-label", `Ảnh ${i + 1}`);
          b.addEventListener("click", () => go(i));
          return b;
        })
      );
    }

    function go(i, auto = false) {
      const max = maxIndex();
      // tua vòng: qua ảnh cuối thì về đầu và ngược lại
      index = i > max ? 0 : i < 0 ? max : i;
      setX(-index * step());
      [...dotsWrap.children].forEach((d, k) => d.classList.toggle("is-active", k === index));
      if (!auto) restartAuto(); // khách tự chuyển ảnh -> đếm lại 5s từ đầu
    }

    // Tự chuyển ảnh mỗi 5 giây (dừng khi đang kéo hoặc tab bị ẩn)
    const AUTOPLAY_MS = 5000;
    let autoTimer = 0;
    function restartAuto() {
      clearInterval(autoTimer);
      autoTimer = setInterval(() => {
        if (!drag && !document.hidden) go(index + 1, true);
      }, AUTOPLAY_MS);
    }

    $(".album__nav--prev", album).addEventListener("click", () => go(index - 1));
    $(".album__nav--next", album).addEventListener("click", () => go(index + 1));

    // Kéo bằng chuột / ngón tay
    let drag = null;
    viewport.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      drag = { x: e.clientX, y: e.clientY, dx: 0, scale: screenScale(), base: -index * step() };
      albumDragged = false;
    });
    viewport.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const dx = (e.clientX - drag.x) / drag.scale;
      if (!albumDragged) {
        if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(e.clientY - drag.y)) return;
        albumDragged = true;
        viewport.classList.add("is-dragging");
        viewport.setPointerCapture(e.pointerId);
      }
      drag.dx = dx;
      // ra ngoài 2 đầu thì kéo nặng tay hơn
      const x = drag.base + dx;
      const min = -maxIndex() * step();
      setX(x > 0 ? x / 3 : x < min ? min + (x - min) / 3 : x);
    });
    const endDrag = () => {
      if (!drag) return;
      const { dx } = drag;
      drag = null;
      viewport.classList.remove("is-dragging");
      if (!albumDragged) return;
      const moved = Math.round(-dx / step());
      const target = moved !== 0 ? index + moved : Math.abs(dx) > 40 ? index + (dx < 0 ? 1 : -1) : index;
      go(Math.max(0, Math.min(maxIndex(), target))); // kéo quá đầu/cuối thì bật lại, không tua vòng
    };
    viewport.addEventListener("pointerup", endDrag);
    viewport.addEventListener("pointercancel", endDrag);

    // Vuốt ngang trên trackpad: mỗi lần vuốt sang 1 ảnh
    let wheelLock = 0;
    viewport.addEventListener(
      "wheel",
      (e) => {
        if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || Math.abs(e.deltaX) < 8) return;
        e.preventDefault();
        const now = performance.now();
        if (now < wheelLock) return;
        wheelLock = now + 500;
        go(index + (e.deltaX > 0 ? 1 : -1));
      },
      { passive: false }
    );

    // Đổi kích thước (vd. xoay ngang điện thoại): số ảnh mỗi khung có thể đổi
    window.addEventListener("resize", () => {
      renderDots();
      go(Math.min(index, maxIndex()));
    });

    renderDots();
    go(0);
  })();

  function showPhoto(i) {
    photoIndex = (i + photos.length) % photos.length;
    const src = photos[photoIndex];
    frame.style.backgroundImage = getComputedStyle(src).backgroundImage;
    frame.style.backgroundPosition = getComputedStyle(src).backgroundPosition;
    frame.style.backgroundSize = "cover";
    frame.style.backgroundRepeat = "no-repeat";
    $("figcaption", frame).textContent = $("figcaption", src)?.textContent || "";
  }

  function openLightbox(i) {
    showPhoto(i);
    lightbox.hidden = false;
    $(".lightbox__close", lightbox).focus();
  }

  function closeLightbox() {
    lightbox.hidden = true;
    photos[photoIndex].focus({ preventScroll: true });
  }

  photos.forEach((ph, i) => {
    ph.tabIndex = 0;
    ph.setAttribute("role", "button");
    ph.setAttribute("aria-label", `Xem ảnh ${i + 1}`);
    ph.addEventListener("click", () => {
      if (albumDragged) return; // vừa kéo slider, không phải bấm xem ảnh
      openLightbox(i);
    });
    ph.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        openLightbox(i);
      }
    });
  });

  $(".lightbox__close", lightbox).addEventListener("click", closeLightbox);
  $(".lightbox__nav--prev", lightbox).addEventListener("click", () => showPhoto(photoIndex - 1));
  $(".lightbox__nav--next", lightbox).addEventListener("click", () => showPhoto(photoIndex + 1));
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener("keydown", (e) => {
    if (lightbox.hidden) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") showPhoto(photoIndex - 1);
    if (e.key === "ArrowRight") showPhoto(photoIndex + 1);
  });

  // Vuốt ngang trong lightbox để chuyển ảnh
  let lbStartX = null;
  lightbox.addEventListener("touchstart", (e) => (lbStartX = e.touches[0].clientX), { passive: true });
  lightbox.addEventListener("touchend", (e) => {
    if (lbStartX === null) return;
    const dx = e.changedTouches[0].clientX - lbStartX;
    lbStartX = null;
    if (Math.abs(dx) > 50) showPhoto(photoIndex + (dx < 0 ? 1 : -1));
  });

  /* =========================================================
     Lời chúc
     ========================================================= */
  const form = $("#wish-form");
  // Khách mở link ?to=... -> điền sẵn tên (defaultValue để form.reset() vẫn giữ tên)
  if (guest) form.elements.namedItem("name").defaultValue = guest;
  const wishesList = $("#wishes-list");
  const wishCount = $("#wish-count");
  const wishesEmpty = $("#wishes-empty");
  const STORAGE_KEY = "wedding-hieu-chi-wishes";
  const ATTEND_LABEL = { yes: "Sẽ tham dự", maybe: "Chưa chắc", no: "Không tham dự" };

  function loadWishes() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveWishes(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
      /* trình duyệt chặn storage */
    }
  }

  function renderWishes() {
    const list = loadWishes();
    wishCount.textContent = list.length;
    wishesEmpty.hidden = list.length > 0;
    wishesList.replaceChildren(
      ...list
        .slice()
        .reverse()
        .map((w) => {
          const li = document.createElement("li");
          const msg = document.createElement("p");
          const meta = document.createElement("div");
          const who = document.createElement("strong");
          const badge = document.createElement("span");
          msg.textContent = `“${w.message}”`;
          who.textContent = w.name;
          badge.className = "wishes__badge";
          badge.textContent = w.attend === "yes"
            ? `${ATTEND_LABEL.yes} · ${w.guests} người`
            : ATTEND_LABEL[w.attend] || "";
          meta.className = "wishes__meta";
          meta.append(who, badge);
          li.append(msg, meta);
          return li;
        })
    );
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const name = data.name.trim();
    const message = data.message.trim();
    if (!name || !message) return;

    const list = loadWishes();
    list.push({
      name,
      attend: data.attend,
      guests: Number(data.guests) || 1,
      message,
      at: new Date().toISOString(),
    });
    saveWishes(list);
    renderWishes();
    wishesList.scrollTop = 0;
    form.reset();

    showToast(
      data.attend === "yes"
        ? `Cảm ơn ${name}! Hẹn gặp bạn trong ngày vui ♥`
        : `Cảm ơn ${name} đã gửi lời chúc ♥`
    );
    burstPetals(24);
  });

  renderWishes();

  /* =========================================================
     Toast
     ========================================================= */
  const toast = $("#toast");
  let toastTimer;
  function showToast(text) {
    toast.textContent = text;
    toast.classList.add("is-shown");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-shown"), 3200);
  }
})();
