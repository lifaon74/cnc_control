{
  "targets": [
    {
      "target_name": "binding",
      "defines": [
        "V8_DEPRECATION_WARNINGS=1"
      ],
      "sources": [
        "binding.cc", "libs/bcm2835/bcm2835.c"
      ],
      "include_dirs": [
        "<!(node -e \"require('nan')\")"
      ]
    }
  ]
}