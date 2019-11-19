from django.test import TestCase
from app.api.formulas import lookup_formula

class TestFormulas(TestCase):
    def setUp(self):
        pass

    def tearDown(self):
        pass

    def test_formulas(self):
        # Original
        self.assertTrue(lookup_formula("_TESTRB", "RGB") == "b1+b3")

        # Swap bands
        self.assertTrue(lookup_formula("_TESTRB", "BGR") == "b3+b1")
        self.assertTrue(lookup_formula("_TESTRB", "NRB") == "b2+b3")

        # Not enough info
        self.assertRaises(ValueError, lookup_formula, "_TESTRB", "NRG")

        # Functions work
        self.assertTrue(lookup_formula("_TESTFUNC", "RGB") == "b1+(sqrt(b3))")


