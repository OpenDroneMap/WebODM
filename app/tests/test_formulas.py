from django.test import TestCase
from app.api.formulas import lookup_formula

class TestFormulas(TestCase):
    def setUp(self):
        pass

    def tearDown(self):
        pass

    def test_formulas(self):
        # Original
        self.assertTrue(lookup_formula("_TESTRB", "RGB") == "b3+b1")

        # Swap bands
        self.assertTrue(lookup_formula("_TESTRB", "BGR") == "b1+b3")
        self.assertTrue(lookup_formula("_TESTRB", "NRB") == "b2+b3")

