import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { TransitionProvider } from "../context/TransitionProvider";

// ======================================================
// LAZY LOADED PAGES
// ======================================================

// The Home page is no longer used: "/" goes straight to the
// Events tickets (see the route below).
// import Ham from "../pages/Ham/Ham.jsx"
const Registration = lazy(
  () => import("../pages/registration/Registration")
);

const ComingSoon = lazy(
  () => import("../pages/ComingSoon")
);

const About = lazy(
  () => import("../pages/About")
);

const Contact = lazy(
  () => import("../pages/Contact")
);

const TicketsPage = lazy(
  () => import("../pages/EventsPage/TicketsPage")
);

const EventsPage = lazy(
  () => import("../pages/EventsPage/EventsPage")
);

// ======================================================
// TYPES
// ======================================================

interface AppRoutesProps {
  preloaderDone: boolean;
  preloaderExiting: boolean;
}

// ======================================================
// APP ROUTES
// ======================================================

// The props fed the Home page's intro; App.tsx still passes
// them, but no route needs them now that "/" goes to the tickets.
export default function AppRoutes(_props: AppRoutesProps) {
  return (
    <TransitionProvider>
      <Suspense fallback={null}>
        <Routes>

          {/* ==================================================
              HOME -> EVENTS TICKETS
          ================================================== */}

          <Route
            path="/"
            element={<Navigate to="/events" replace />}
          />

          {/* ==================================================
              COMING SOON
          ================================================== */}

          <Route
            path="/comingsoon"
            element={<ComingSoon />}
          />

          {/* ==================================================
              CONTACT
          ================================================== */}

          <Route
            path="/contactus"
            element={<Contact />}
          />

          {/* ==================================================
              REGISTRATION
          ================================================== */}

          <Route
            path="/register"
            element={<Registration />}
          />

          {/* ==================================================
              ABOUT
          ================================================== */}

          <Route
            path="/aboutUs"
            element={<About />}
          />

          {/* ==================================================
              EVENTS
          ================================================== */}

          {/* the tickets: one per school */}
          <Route
            path="/events"
            element={<TicketsPage />}
          />

          {/* a school's tents, e.g. /events/engineering */}
          <Route
            path="/events/:school"
            element={<EventsPage />}
          />
          

        </Routes>
      </Suspense>
    </TransitionProvider>
  );
}