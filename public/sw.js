self.addEventListener("push", (event) => {
  let data = { title: "CabRadar", body: "Ny varning", url: "/" };
  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch {
    // use defaults
  }

  const isEmergency = data.kind === "taxi_emergency";
  const options = {
    body: data.body,
    icon: "/logo.png",
    badge: "/logo.png",
    data: {
      url: data.url,
      alertId: data.alertId,
      kind: data.kind,
    },
    tag: isEmergency ? `emergency-${data.alertId ?? "active"}` : "cab-radar-alert",
    renotify: true,
  };

  if (isEmergency && Array.isArray(data.actions)) {
    options.actions = data.actions;
  }

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") {
    return;
  }

  const url = event.notification.data?.url ?? "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
