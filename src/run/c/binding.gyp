{
  "targets": [
    {
      "target_name": "binding",
      "defines": [
        "V8_DEPRECATION_WARNINGS=1"
      ],
      "sources": [
        "binding.cc"
      ],
      "include_dirs": [
        "<!(node -e \"require('nan')\")"
      ]
    }
  ]
}