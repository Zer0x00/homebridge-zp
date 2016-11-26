# homebridge-zp
[![npm](https://img.shields.io/npm/dt/homebridge-zp.svg)](https://www.npmjs.com/package/homebridge-zp) [![npm](https://img.shields.io/npm/v/homebridge-zp.svg)](https://www.npmjs.com/package/homebridge-zp)

## Homebridge plug-in for Sonos ZonePlayer
(C) 2016, Erik Baauw

This plug-in exposes Sonos ZonePlayers to Apple's Homekit.  It provides the following features:
- Automatic discovery of Sonos ZonePlayers, taking into account stereo pairs and home cinema setup;
- ZonePlayer On/Off control from Homekit, with automatic grouping.
- ZonePlayer volume and mute control from Homekit.
- Monitoring ZonePlayer on/off state, volume, mute, and current track from Homekit.  Like the Sonos app, homebridge-zp subscribes to ZonePlayer events to receive notifications.

## Zones
The homebridge-zp plug-in creates a `Switch` accessory per zone (room), named after the zone, e.g. "Living Room Sonos" for the "Living Room" zone.  In addition to the standard `On` characteristic, additional characterisics for `Volume`, `Mute`, and `Track` are provided.  Note that `Track` is a custom characteristic, which might not be supported by all Homekit apps.  Also note that the iOS 10 Home app does not support `Volume` and `Mute`, even thought these are standard Homekit characteristics.

## Automatic Grouping
With just one zone, the `On` characteristic works as Play/Pause button.  With multiple zones, the `On` characteristic also provides automatic grouping.  When `On` is set to `true`, homebridge-zp checks whether another zone is already playing.  If so, the zone joins the group of the other zone, otherwise the zone starts playing.  When `On` is set to `false`, homebridge-zp checks whether the zone is member of a group.  If so, the zone leaves the group, otherwise the zone stops playing.  Note that when the coordinator leaves the group, the music to the other zones is briefly interrupted, as the new coordinator assumes its role.

## Configuration
In homebridge's `config.json` you need to specify a platform for homebridge-zp;
```
  "platforms": [
    {
      "platform": "ZP",
      "name": "ZP"
    }
  ]
```

## Troubleshooting

The homebridge-zp plug-in outputs an info message for each Homekit characteristic value it sets and for each Homekit characteristic value change notification it receives.  When homebridge is started with `-D`, homebridge-zp outputs a debug message for each request it makes to a Sonos ZonePlayer and for each ZonePlayer state change it receives.

## Caveats
- The homebridge-zp plug-in is a hobby project of mine, provided as-is, with no warranty whatsoever.  I've been running it successfully at my home for months, but your mileage might vary.  Please report any issues on GitHub.
- Homebridge is a great platform, but not really intented for consumers.
- Homekit is still relatively new, and the iOS 10 built-in `Home` app provides only limited support.  You might want to check some other homekit apps, like Elgato's `Eve` (free), Matthias Hochgatterer's `Home`, or, if you use `XCode`, Apple's `HMCatalog` example app.
- The Homekit terminology needs some getting used to.  An _accessory_ more or less corresponds to a physical device, accessible from your iOS device over WiFi or Bluetooth.  A _bridge_ (like homebridge) provides access to multiple bridged accessories.  An accessory might provide multiple _services_.  Each service corresponds to a virtual device (like a `Lightbulb`, `Switch`, `Motion Sensor`, ...).  There is also an accessory information service.  Siri interacts with services, not with accessories.  A service contains one or more _characteristics_.  A characteristic is like a service attribute, which might be read or written by Homekit apps.  You might want to checkout Apple's `Homekit Accessory Simulator`, which is distributed a an additional tool for `XCode`.
- The Sonos terminology needs some getting used to.  A _zone_ corresponds to a room.  It contains of a single ZonePlayer, two ZonePlayers configured as stereo pair, or a home cinema setup (with separate surround and/or sub speakers).  Typically, zone setup is static; you would only change it when re-arranging your rooms.  A _group_ is a collection of zones/rooms, playing the same music in sync.  A group is controlled by its _coordinator_.  Typically, groups are dynamic, you add and/or remove zones to/from a group when listening to your music.  Play/Pause control is per group.  Volume/Mute control is per zone (and per group, but homebridge-zp doesn't support that).